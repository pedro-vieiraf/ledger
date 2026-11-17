import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import {
  desktopColors,
  desktopFont,
  desktopLayout,
  desktopShadows,
} from '@/components/desktop/desktop-theme';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { InlineFeedback } from '@/components/feedback/inline-feedback';
import { RecurrenceFormModal } from '@/components/recurrences/recurrence-form-modal';
import {
  formatCurrency,
  formatRecurrenceDate,
  frequencyLabel,
  recurrenceDescription,
} from '@/components/recurrences/recurrence-utils';
import { useAccounts } from '@/contexts/accounts-context';
import { useFeedback } from '@/contexts/feedback-context';
import { usePrivacy } from '@/contexts/privacy-context';
import { useRecurrences } from '@/contexts/recurrences-context';
import { getCategories, type Category } from '@/services/categories-api';
import type { Recurrence } from '@/services/recurrences-api';
import {
  filterRecurrences,
  summarizeRecurrences,
  type RecurrenceStatusFilter,
} from '@/utils/recurrence-summary';
import { maskMoney } from '@/utils/privacy';

const ICONS = {
  add: { ios: 'plus', android: 'add', web: 'add' },
  refresh: {
    ios: 'arrow.clockwise',
    android: 'refresh',
    web: 'refresh',
  },
  search: {
    ios: 'magnifyingglass',
    android: 'search',
    web: 'search',
  },
  searchOff: {
    ios: 'magnifyingglass',
    android: 'search_off',
    web: 'search_off',
  },
  close: { ios: 'xmark', android: 'close', web: 'close' },
  more: { ios: 'ellipsis', android: 'more_horiz', web: 'more_horiz' },
  edit: {
    ios: 'square.and.pencil',
    android: 'edit',
    web: 'edit',
  },
  cancel: {
    ios: 'pause.circle',
    android: 'pause_circle_outline',
    web: 'pause_circle_outline',
  },
  activate: {
    ios: 'play.circle',
    android: 'play_circle_outline',
    web: 'play_circle_outline',
  },
  delete: {
    ios: 'trash',
    android: 'delete_outline',
    web: 'delete_outline',
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
  recurrence: { ios: 'repeat', android: 'repeat', web: 'repeat' },
  calendar: {
    ios: 'calendar',
    android: 'calendar_today',
    web: 'calendar_today',
  },
  clock: {
    ios: 'clock',
    android: 'schedule',
    web: 'schedule',
  },
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

const STATUS_FILTERS: { label: string; value: RecurrenceStatusFilter }[] = [
  { label: 'Todas', value: 'all' },
  { label: 'Ativas', value: 'ACTIVE' },
  { label: 'Inativas', value: 'INACTIVE' },
];

const ROW_MENU_WIDTH = 188;
const ROW_MENU_HEIGHT = 142;

type FormTarget =
  | { mode: 'create' }
  | { mode: 'edit'; recurrence: Recurrence }
  | null;

type MenuAnchor = {
  recurrence: Recurrence;
  left: number;
  top: number;
};

type ConfirmTarget = {
  action: 'cancel' | 'delete';
  recurrence: Recurrence;
};

type RecurrenceRowProps = {
  recurrence: Recurrence;
  accountName: string;
  categoryName: string;
  isLast: boolean;
  disabled: boolean;
  onOpenMenu: (
    event: GestureResponderEvent,
    recurrence: Recurrence,
  ) => void;
};

function RecurrenceRow({
  recurrence,
  accountName,
  categoryName,
  isLast,
  disabled,
  onOpenMenu,
}: RecurrenceRowProps) {
  const { hidden } = usePrivacy();
  const isActive = recurrence.status === 'ACTIVE';
  const isIncome = recurrence.type === 'INCOME';
  const tone = isIncome
    ? {
        foreground: desktopColors.income,
        background: desktopColors.incomeSoft,
        icon: 'income' as const,
        prefix: '+ ',
      }
    : {
        foreground: desktopColors.expense,
        background: desktopColors.expenseSoft,
        icon: 'expense' as const,
        prefix: '− ',
      };

  return (
    <View
      style={[
        styles.row,
        isLast && styles.rowLast,
        !isActive && styles.rowInactive,
      ]}
    >
      <View style={styles.descriptionCell}>
        <View
          style={[
            styles.typeIcon,
            { backgroundColor: tone.background },
          ]}
        >
          <Icon name={tone.icon} size={13} color={tone.foreground} />
        </View>

        <View style={styles.descriptionBody}>
          <Text style={styles.descriptionText} numberOfLines={1}>
            {recurrenceDescription(recurrence)}
          </Text>
          <Text style={styles.descriptionMeta} numberOfLines={1}>
            {categoryName}
          </Text>
        </View>
      </View>

      <View style={styles.accountCell}>
        <Text style={styles.cellText} numberOfLines={1}>
          {accountName}
        </Text>
      </View>

      <View style={styles.frequencyCell}>
        <Text style={styles.cellText} numberOfLines={1}>
          {frequencyLabel(recurrence.frequency)}
        </Text>
      </View>

      <View style={styles.amountCell}>
        <Text
          style={[styles.amountText, { color: tone.foreground }]}
          numberOfLines={1}
        >
          {maskMoney(
            `${tone.prefix}${formatCurrency(
              recurrence.amount,
              recurrence.currency,
            )}`,
            hidden,
          )}
        </Text>
      </View>

      <View style={styles.nextCell}>
        <Text style={styles.dateText} numberOfLines={1}>
          {formatRecurrenceDate(recurrence.nextOccurrence)}
        </Text>
      </View>

      <View style={styles.statusCell}>
        <View
          style={[
            styles.statusBadge,
            isActive ? styles.statusBadgeActive : styles.statusBadgeInactive,
          ]}
        >
          <View
            style={[
              styles.statusDot,
              isActive ? styles.statusDotActive : styles.statusDotInactive,
            ]}
          />
          <Text
            style={[
              styles.statusText,
              isActive ? styles.statusTextActive : styles.statusTextInactive,
            ]}
          >
            {isActive ? 'Ativa' : 'Inativa'}
          </Text>
        </View>
      </View>

      <View style={styles.actionsCell}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Ações de ${recurrenceDescription(recurrence)}`}
          disabled={disabled}
          onPress={(event) => onOpenMenu(event, recurrence)}
          style={({ pressed }) => [
            styles.actionsButton,
            pressed && styles.actionsButtonPressed,
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
}

export function DesktopRecurrences() {
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
    cancelRecurrence,
    activateRecurrence,
    deleteRecurrence,
  } = useRecurrences();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState('');

  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const hasLoadedRef = useRef(false);
  const [refreshing, setRefreshing] = useState(false);

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<RecurrenceStatusFilter>('all');

  const [formTarget, setFormTarget] = useState<FormTarget>(null);
  const [menuAnchor, setMenuAnchor] = useState<MenuAnchor | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(
    null,
  );
  const [actionError, setActionError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const activeAccounts = useMemo(
    () => accounts.filter((account) => account.status === 'ACTIVE'),
    [accounts],
  );

  const accountsById = useMemo(
    () => new Map(accounts.map((account) => [account.id, account])),
    [accounts],
  );

  const accountNameById = useMemo(
    () =>
      new Map(
        accounts.map((account) => [
          account.id,
          account.status === 'ACTIVE'
            ? account.name
            : `${account.name} (inativa)`,
        ]),
      ),
    [accounts],
  );

  const categoriesById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );

  const loadCategories = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setCategoriesLoading(true);
    }

    setCategoriesError('');

    try {
      setCategories(await getCategories());
    } catch (cause) {
      setCategoriesError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível carregar as categorias.',
      );
    } finally {
      if (!options?.silent) {
        setCategoriesLoading(false);
      }
    }
  }, []);

  const loadScreenData = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setRefreshing(true);
      }

      await Promise.allSettled([
        refreshRecurrences().catch(() => {
          // O erro permanece exposto pelo contexto de recorrências.
        }),
        refreshAccounts().catch(() => {
          // O erro permanece exposto pelo contexto de contas.
        }),
        loadCategories({ silent: options?.silent }),
      ]);

      hasLoadedRef.current = true;
      setHasLoadedOnce(true);
      setRefreshing(false);
    },
    [loadCategories, refreshAccounts, refreshRecurrences],
  );

  useFocusEffect(
    useCallback(() => {
      void loadScreenData({ silent: hasLoadedRef.current });
    }, [loadScreenData]),
  );

  const summary = useMemo(
    () => summarizeRecurrences(recurrences),
    [recurrences],
  );

  const filteredRecurrences = useMemo(
    () =>
      filterRecurrences(recurrences, {
        query,
        status,
        accountNameById,
      }),
    [accountNameById, query, recurrences, status],
  );

  const isInitialLoading =
    !hasLoadedOnce &&
    (recurrencesLoading || accountsLoading || categoriesLoading);

  const error =
    recurrencesError ?? accountsError ?? categoriesError ?? '';

  const hasActiveFilters = query.trim().length > 0 || status !== 'all';
  const actionsDisabled = actionLoading;

  const summaryCards = [
    {
      key: 'active',
      label: 'Assinaturas ativas',
      value: String(summary.activeCount),
      hint:
        summary.totalCount === 1
          ? '1 assinatura cadastrada'
          : `${summary.totalCount} assinaturas cadastradas`,
      icon: 'recurrence' as const,
    },
    {
      key: 'monthly',
      label: 'Valor recorrente mensal',
      value: maskMoney(formatCurrency(summary.monthlyExpenseTotal), hidden),
      hint:
        summary.monthlyExpenseCount === 0
          ? 'Nenhuma despesa mensal ativa'
          : summary.monthlyExpenseCount === 1
            ? '1 despesa mensal ativa em BRL'
            : `${summary.monthlyExpenseCount} despesas mensais ativas em BRL`,
      icon: 'calendar' as const,
    },
    {
      key: 'upcoming',
      label: 'Próximas ocorrências',
      value: String(summary.upcomingCount),
      hint: `Ativas nos próximos ${summary.upcomingWindowDays} dias`,
      icon: 'clock' as const,
    },
  ];

  function openCreateForm() {
    if (actionsDisabled) {
      return;
    }

    if (activeAccounts.length === 0) {
      showToast({
        variant: 'warning',
        title: 'Nenhuma conta ativa',
        message:
          'Crie ou reative uma conta antes de cadastrar uma assinatura.',
      });
      return;
    }

    setFormTarget({ mode: 'create' });
  }

  function openEditForm(recurrence: Recurrence) {
    if (actionsDisabled) {
      return;
    }

    setFormTarget({ mode: 'edit', recurrence });
  }

  function openRowMenu(
    event: GestureResponderEvent,
    recurrence: Recurrence,
  ) {
    if (actionsDisabled) {
      return;
    }

    const { pageX, pageY } = event.nativeEvent;

    setMenuAnchor({
      recurrence,
      left: Math.min(
        Math.max(pageX - ROW_MENU_WIDTH + 24, 12),
        Math.max(12, windowWidth - ROW_MENU_WIDTH - 12),
      ),
      top: Math.min(
        pageY + 8,
        Math.max(12, windowHeight - ROW_MENU_HEIGHT - 12),
      ),
    });
  }

  function requestConfirmation(
    action: ConfirmTarget['action'],
    recurrence: Recurrence,
  ) {
    if (actionsDisabled) {
      return;
    }

    setActionError('');
    setConfirmTarget({ action, recurrence });
  }

  function closeConfirmation() {
    if (actionLoading) {
      return;
    }

    setConfirmTarget(null);
    setActionError('');
  }

  async function runConfirmedAction() {
    if (!confirmTarget || actionLoading) {
      return;
    }

    const { action, recurrence } = confirmTarget;

    setActionLoading(true);
    setActionError('');

    try {
      if (action === 'cancel') {
        await cancelRecurrence(recurrence.id);

        showToast({
          variant: 'success',
          title: 'Assinatura cancelada',
          message: 'Nenhuma nova ocorrência será gerada.',
        });
      } else {
        await deleteRecurrence(recurrence.id);

        showToast({
          variant: 'success',
          title: 'Assinatura excluída',
          message: 'As transações já geradas foram preservadas.',
        });
      }

      setConfirmTarget(null);
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

  async function reactivate(recurrence: Recurrence) {
    if (actionLoading) {
      return;
    }

    setActionLoading(true);
    setActionError('');

    try {
      await activateRecurrence(recurrence.id);

      showToast({
        variant: 'success',
        title: 'Assinatura reativada',
        message: 'As próximas ocorrências voltarão a ser geradas.',
      });
    } catch (cause) {
      showToast({
        variant: 'error',
        title: 'Não foi possível reativar a assinatura',
        message:
          cause instanceof Error
            ? cause.message
            : 'Tente novamente em instantes.',
      });
    } finally {
      setActionLoading(false);
    }
  }

  function clearFilters() {
    setQuery('');
    setStatus('all');
  }

  const emptyTitle = hasActiveFilters
    ? 'Nenhuma assinatura encontrada'
    : 'Nenhuma assinatura cadastrada';

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.pageHeader}>
        <View style={styles.heading}>
          <Text style={styles.title}>Assinaturas</Text>
          <Text style={styles.subtitle}>
            Acompanhe despesas e receitas recorrentes em um só lugar.
          </Text>
        </View>

        <View style={styles.headerActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Atualizar assinaturas"
            disabled={refreshing}
            onPress={() => void loadScreenData()}
            style={({ pressed }) => [
              styles.refreshButton,
              pressed && styles.refreshButtonPressed,
              refreshing && styles.buttonDisabled,
            ]}
          >
            {refreshing ? (
              <ActivityIndicator
                size="small"
                color={desktopColors.primary}
              />
            ) : (
              <Icon name="refresh" size={16} color={desktopColors.primary} />
            )}
            <Text style={styles.refreshLabel}>
              {refreshing ? 'Atualizando' : 'Atualizar'}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Nova assinatura"
            disabled={actionsDisabled}
            onPress={openCreateForm}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
              actionsDisabled && styles.buttonDisabled,
            ]}
          >
            <Icon name="add" size={16} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Nova assinatura</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.summaryGrid}>
        {summaryCards.map((card) => (
          <View key={card.key} style={styles.summaryCard}>
            <View style={styles.summaryIcon}>
              <Icon name={card.icon} size={18} color={desktopColors.primary} />
            </View>
            <Text style={styles.summaryLabel}>{card.label}</Text>
            <Text
              style={styles.summaryValue}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {card.value}
            </Text>
            <Text style={styles.summaryHint}>{card.hint}</Text>
          </View>
        ))}
      </View>

      <View style={styles.filtersCard}>
        <View id="search-field-recurrences" style={styles.searchField}>
          <Icon
            name="search"
            size={18}
            color={desktopColors.textMuted}
            style={styles.searchIcon}
          />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar por descrição ou conta"
            placeholderTextColor={desktopColors.textMuted}
            style={styles.searchInput}
            accessibilityLabel="Buscar assinaturas por descrição ou conta"
            returnKeyType="search"
          />
          {query.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Limpar busca"
              onPress={() => setQuery('')}
              hitSlop={8}
            >
              <Icon
                name="close"
                size={14}
                color={desktopColors.textMuted}
                style={styles.clearSearch}
              />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.statusFilters}>
          {STATUS_FILTERS.map((option) => {
            const selected = status === option.value;

            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setStatus(option.value)}
                style={({ pressed }) => [
                  styles.statusFilterButton,
                  selected && styles.statusFilterButtonActive,
                  pressed && !selected && styles.statusFilterButtonPressed,
                ]}
              >
                <Text
                  style={[
                    styles.statusFilterText,
                    selected && styles.statusFilterTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.filtersFooter}>
          <Text style={styles.filterHint}>
            {filteredRecurrences.length}{' '}
            {filteredRecurrences.length === 1
              ? 'assinatura exibida'
              : 'assinaturas exibidas'}
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
              <Text style={styles.clearFiltersText}>Limpar filtros</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {error && recurrences.length > 0 ? (
        <InlineFeedback
          variant="error"
          title="Não foi possível atualizar as assinaturas"
          message={error}
        />
      ) : null}

      {isInitialLoading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={desktopColors.primary} />
          <Text style={styles.loadingText}>Carregando assinaturas...</Text>
        </View>
      ) : error && recurrences.length === 0 ? (
        <View style={styles.stateCard}>
          <View style={styles.stateIcon}>
            <Icon
              name="recurrence"
              size={26}
              color={desktopColors.primary}
            />
          </View>
          <Text style={styles.stateTitle}>
            Não foi possível carregar as assinaturas
          </Text>
          <Text style={styles.stateText}>{error}</Text>

          <Pressable
            accessibilityRole="button"
            onPress={() => void loadScreenData()}
            style={({ pressed }) => [
              styles.stateButton,
              pressed && styles.stateButtonPressed,
            ]}
          >
            <Text style={styles.stateButtonText}>Tentar novamente</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.tableCard}>
          <View style={styles.tableHeader}>
            <View style={styles.tableHeading}>
              <Text style={styles.tableTitle}>Assinaturas</Text>
              <Text style={styles.tableSubtitle}>
                {hasActiveFilters
                  ? `${filteredRecurrences.length} de ${summary.totalCount} após os filtros`
                  : `${summary.totalCount} ${
                      summary.totalCount === 1
                        ? 'assinatura cadastrada'
                        : 'assinaturas cadastradas'
                    }`}
              </Text>
            </View>

            <View style={styles.tableCounters}>
              <Text style={styles.tableCounter}>
                {summary.activeCount} ativa
                {summary.activeCount === 1 ? '' : 's'}
              </Text>
              <Text style={styles.tableCounter}>
                {summary.inactiveCount} inativa
                {summary.inactiveCount === 1 ? '' : 's'}
              </Text>
            </View>
          </View>

          {summary.totalCount === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.stateIcon}>
                <Icon
                  name="recurrence"
                  size={26}
                  color={desktopColors.primary}
                />
              </View>
              <Text style={styles.emptyTitle}>{emptyTitle}</Text>
              <Text style={styles.emptyText}>
                Cadastre uma despesa ou receita recorrente para que as
                movimentações sejam criadas automaticamente.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={openCreateForm}
                style={({ pressed }) => [
                  styles.emptyButton,
                  pressed && styles.emptyButtonPressed,
                ]}
              >
                <Icon name="add" size={14} color={desktopColors.primary} />
                <Text style={styles.emptyButtonText}>Nova assinatura</Text>
              </Pressable>
            </View>
          ) : filteredRecurrences.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.stateIcon}>
                <Icon
                  name="searchOff"
                  size={26}
                  color={desktopColors.primary}
                />
              </View>
              <Text style={styles.emptyTitle}>{emptyTitle}</Text>
              <Text style={styles.emptyText}>
                Ajuste a busca ou o filtro de situação para visualizar as
                assinaturas.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={clearFilters}
                style={({ pressed }) => [
                  styles.emptyButton,
                  pressed && styles.emptyButtonPressed,
                ]}
              >
                <Text style={styles.emptyButtonText}>Limpar filtros</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.tableHead}>
                <Text style={[styles.headCell, styles.descriptionCell]}>
                  Descrição
                </Text>
                <Text style={[styles.headCell, styles.accountCell]}>
                  Conta
                </Text>
                <Text style={[styles.headCell, styles.frequencyCell]}>
                  Frequência
                </Text>
                <Text style={[styles.headCell, styles.amountHeader]}>
                  Valor
                </Text>
                <Text style={[styles.headCell, styles.nextCell]}>
                  Próxima ocorrência
                </Text>
                <Text style={[styles.headCell, styles.statusCell]}>
                  Situação
                </Text>
                <View style={styles.actionsCell} />
              </View>

              {filteredRecurrences.map((recurrence, index) => (
                <RecurrenceRow
                  key={recurrence.id}
                  recurrence={recurrence}
                  accountName={
                    accountsById.get(recurrence.accountId)?.name ??
                    'Conta excluída'
                  }
                  categoryName={
                    recurrence.categoryId
                      ? (categoriesById.get(recurrence.categoryId)?.name ??
                        'Categoria indisponível')
                      : 'Sem categoria'
                  }
                  isLast={index === filteredRecurrences.length - 1}
                  disabled={actionsDisabled}
                  onOpenMenu={openRowMenu}
                />
              ))}
            </>
          )}
        </View>
      )}

      <Text style={styles.disclaimer}>
        As ocorrências são geradas pelo backend na data programada. Cancelar
        ou excluir uma assinatura preserva as transações já geradas.
      </Text>

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
                  const { recurrence } = menuAnchor;
                  setMenuAnchor(null);
                  openEditForm(recurrence);
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

              {menuAnchor.recurrence.status === 'ACTIVE' ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    const { recurrence } = menuAnchor;
                    setMenuAnchor(null);
                    requestConfirmation('cancel', recurrence);
                  }}
                  style={({ pressed }) => [
                    styles.rowMenuItem,
                    pressed && styles.rowMenuItemPressed,
                  ]}
                >
                  <Icon
                    name="cancel"
                    size={15}
                    color={desktopColors.textSecondary}
                  />
                  <Text style={styles.rowMenuText}>Cancelar</Text>
                </Pressable>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    const { recurrence } = menuAnchor;
                    setMenuAnchor(null);
                    void reactivate(recurrence);
                  }}
                  style={({ pressed }) => [
                    styles.rowMenuItem,
                    pressed && styles.rowMenuItemPressed,
                  ]}
                >
                  <Icon
                    name="activate"
                    size={15}
                    color={desktopColors.primary}
                  />
                  <Text
                    style={[styles.rowMenuText, styles.rowMenuPrimaryText]}
                  >
                    Reativar
                  </Text>
                </Pressable>
              )}

              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  const { recurrence } = menuAnchor;
                  setMenuAnchor(null);
                  requestConfirmation('delete', recurrence);
                }}
                style={({ pressed }) => [
                  styles.rowMenuItem,
                  pressed && styles.rowMenuItemPressed,
                ]}
              >
                <Icon name="delete" size={15} color={desktopColors.expense} />
                <Text style={[styles.rowMenuText, styles.rowMenuDangerText]}>
                  Excluir
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </Modal>

      <ConfirmDialog
        visible={confirmTarget !== null}
        title={
          confirmTarget?.action === 'delete'
            ? 'Excluir assinatura?'
            : 'Cancelar assinatura?'
        }
        message={
          confirmTarget?.action === 'delete'
            ? 'A assinatura será removida permanentemente. As transações já geradas serão preservadas no histórico.'
            : 'Nenhuma nova ocorrência será gerada. As transações já geradas serão preservadas e a assinatura poderá ser reativada depois.'
        }
        confirmLabel={
          confirmTarget?.action === 'delete' ? 'Excluir' : 'Cancelar assinatura'
        }
        cancelLabel="Voltar"
        tone={confirmTarget?.action === 'delete' ? 'danger' : 'primary'}
        loading={actionLoading}
        error={actionError}
        onConfirm={() => void runConfirmedAction()}
        onCancel={closeConfirmation}
      />

      {formTarget ? (
        <RecurrenceFormModal
          variant="desktop"
          recurrence={
            formTarget.mode === 'edit' ? formTarget.recurrence : undefined
          }
          accounts={activeAccounts}
          categories={categories}
          onClose={() => setFormTarget(null)}
        />
      ) : null}
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
    gap: 20,
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
  refreshButton: {
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
  refreshButtonPressed: {
    backgroundColor: desktopColors.surfaceMuted,
  },
  refreshLabel: {
    color: desktopColors.text,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: desktopFont,
  },
  primaryButton: {
    height: 42,
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
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
  buttonDisabled: {
    opacity: 0.66,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  summaryCard: {
    flexGrow: 1,
    flexBasis: 200,
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
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    backgroundColor: desktopColors.primarySoft,
  },
  summaryLabel: {
    color: desktopColors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontFamily: desktopFont,
  },
  summaryValue: {
    marginTop: 6,
    color: desktopColors.text,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
    fontFamily: desktopFont,
  },
  summaryHint: {
    marginTop: 5,
    color: desktopColors.textMuted,
    fontSize: 10,
    lineHeight: 15,
    fontFamily: desktopFont,
  },
  filtersCard: {
    backgroundColor: desktopColors.surface,
    borderRadius: desktopLayout.radius,
    borderWidth: 1,
    borderColor: desktopColors.border,
    padding: 18,
    gap: 14,
    ...desktopShadows.card,
  },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    paddingHorizontal: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: desktopColors.border,
    backgroundColor: desktopColors.surface,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    color: desktopColors.text,
    fontSize: 12,
    paddingVertical: 11,
    fontFamily: desktopFont,
  },
  clearSearch: {
    paddingLeft: 8,
  },
  statusFilters: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    padding: 4,
    borderRadius: 13,
    backgroundColor: desktopColors.surfaceMuted,
  },
  statusFilterButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  statusFilterButtonActive: {
    backgroundColor: desktopColors.surface,
    shadowColor: desktopColors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  statusFilterButtonPressed: {
    backgroundColor: desktopColors.surface,
  },
  statusFilterText: {
    color: desktopColors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: desktopFont,
  },
  statusFilterTextActive: {
    color: desktopColors.primary,
  },
  filtersFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  filterHint: {
    color: desktopColors.textMuted,
    fontSize: 11,
    fontFamily: desktopFont,
  },
  clearFiltersButton: {
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
  loadingCard: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 64,
    borderRadius: desktopLayout.radius,
    borderWidth: 1,
    borderColor: desktopColors.border,
    backgroundColor: desktopColors.surface,
  },
  loadingText: {
    color: desktopColors.textSecondary,
    fontSize: 12,
    fontFamily: desktopFont,
  },
  tableCard: {
    overflow: 'hidden',
    borderRadius: desktopLayout.radius,
    borderWidth: 1,
    borderColor: desktopColors.border,
    backgroundColor: desktopColors.surface,
    ...desktopShadows.card,
  },
  tableHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
  },
  tableHeading: {
    gap: 4,
  },
  tableTitle: {
    color: desktopColors.text,
    fontSize: 16,
    fontWeight: '800',
    fontFamily: desktopFont,
  },
  tableSubtitle: {
    color: desktopColors.textSecondary,
    fontSize: 11,
    fontFamily: desktopFont,
  },
  tableCounters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tableCounter: {
    color: desktopColors.textMuted,
    fontSize: 10,
    fontWeight: '600',
    fontFamily: desktopFont,
  },
  tableHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: desktopColors.border,
    backgroundColor: desktopColors.surfaceMuted,
  },
  headCell: {
    color: desktopColors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontFamily: desktopFont,
  },
  descriptionCell: {
    flexGrow: 2.2,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  accountCell: {
    flexGrow: 1.3,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
  },
  frequencyCell: {
    width: 84,
    flexShrink: 0,
  },
  amountCell: {
    width: 124,
    flexShrink: 0,
    alignItems: 'flex-end',
  },
  amountHeader: {
    width: 124,
    textAlign: 'right',
  },
  nextCell: {
    width: 108,
    flexShrink: 0,
  },
  statusCell: {
    width: 84,
    flexShrink: 0,
  },
  actionsCell: {
    width: 32,
    flexShrink: 0,
    alignItems: 'flex-end',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: desktopColors.border,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowInactive: {
    opacity: 0.68,
  },
  typeIcon: {
    width: 30,
    height: 30,
    flexShrink: 0,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  descriptionBody: {
    flex: 1,
    minWidth: 0,
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
  cellText: {
    color: desktopColors.textSecondary,
    fontSize: 12,
    fontFamily: desktopFont,
  },
  dateText: {
    color: desktopColors.textSecondary,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    fontFamily: desktopFont,
  },
  amountText: {
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    fontFamily: desktopFont,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusBadgeActive: {
    backgroundColor: desktopColors.incomeSoft,
  },
  statusBadgeInactive: {
    backgroundColor: desktopColors.surfaceMuted,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotActive: {
    backgroundColor: desktopColors.income,
  },
  statusDotInactive: {
    backgroundColor: desktopColors.textMuted,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: desktopFont,
  },
  statusTextActive: {
    color: desktopColors.income,
  },
  statusTextInactive: {
    color: desktopColors.textMuted,
  },
  actionsButton: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsButtonPressed: {
    backgroundColor: desktopColors.surfaceMuted,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 56,
    borderTopWidth: 1,
    borderTopColor: desktopColors.border,
  },
  emptyTitle: {
    color: desktopColors.text,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    fontFamily: desktopFont,
  },
  emptyText: {
    maxWidth: 380,
    marginTop: 8,
    color: desktopColors.textSecondary,
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
    fontFamily: desktopFont,
  },
  emptyButton: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 11,
    backgroundColor: desktopColors.primarySoft,
  },
  emptyButtonPressed: {
    backgroundColor: desktopColors.border,
  },
  emptyButtonText: {
    color: desktopColors.primary,
    fontSize: 11,
    fontWeight: '800',
    fontFamily: desktopFont,
  },
  stateCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
    borderRadius: desktopLayout.radius,
    borderWidth: 1,
    borderColor: desktopColors.border,
    backgroundColor: desktopColors.surface,
    ...desktopShadows.card,
  },
  stateIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    backgroundColor: desktopColors.primarySoft,
  },
  stateTitle: {
    color: desktopColors.text,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    fontFamily: desktopFont,
  },
  stateText: {
    maxWidth: 380,
    marginTop: 8,
    color: desktopColors.textSecondary,
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
    fontFamily: desktopFont,
  },
  stateButton: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 11,
    backgroundColor: desktopColors.primarySoft,
  },
  stateButtonPressed: {
    backgroundColor: desktopColors.border,
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
    width: ROW_MENU_WIDTH,
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
  rowMenuPrimaryText: {
    color: desktopColors.primary,
  },
  rowMenuDangerText: {
    color: desktopColors.expense,
  },
});

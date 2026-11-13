import { useMemo, useRef, useState } from 'react';
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
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import DatePickerField from '@/components/date-picker-field';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { InlineFeedback } from '@/components/feedback/inline-feedback';
import { formatCurrency } from '@/components/desktop/desktop-format';
import {
  desktopColors,
  desktopFont,
  desktopLayout,
  desktopShadows,
} from '@/components/desktop/desktop-theme';
import {
  PERIOD_OPTIONS,
  TYPE_OPTIONS,
  type DesktopTransaction,
  type PeriodFilter,
  type TransactionTypeFilter,
} from '@/components/desktop/transactions/desktop-transactions-data';
import { usePrivacy } from '@/contexts/privacy-context';
import { maskMoney } from '@/utils/privacy';
import { useDesktopTransactions } from '@/components/desktop/transactions/use-desktop-transactions';
import {
  TransactionFormModal,
  type TransactionFormMode,
} from '@/components/transactions/transaction-form-modal';
import { useFeedback } from '@/contexts/feedback-context';
import { useTransactions } from '@/contexts/transactions-context';
import type { TransactionType } from '@/services/transactions-api';

type SelectOption = {
  label: string;
  value: string;
};

/**
 * Ícones da página de Transações.
 * Usa a mesma biblioteca do Dashboard (`expo-symbols`), com nomes por
 * plataforma. Isso evita glifos/emoji e mantém espessura e alinhamento.
 */
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
  chevronDown: {
    ios: 'chevron.down',
    android: 'keyboard_arrow_down',
    web: 'keyboard_arrow_down',
  },
  chevronLeft: {
    ios: 'chevron.left',
    android: 'chevron_left',
    web: 'chevron_left',
  },
  chevronRight: {
    ios: 'chevron.right',
    android: 'chevron_right',
    web: 'chevron_right',
  },
  more: { ios: 'ellipsis', android: 'more_horiz', web: 'more_horiz' },
  edit: {
    ios: 'square.and.pencil',
    android: 'edit',
    web: 'edit',
  },
  delete: {
    ios: 'trash',
    android: 'delete_outline',
    web: 'delete_outline',
  },
  close: { ios: 'xmark', android: 'close', web: 'close' },
  check: { ios: 'checkmark', android: 'check', web: 'check' },
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
  recurring: { ios: 'repeat', android: 'repeat', web: 'repeat' },
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

type TransactionTone = {
  foreground: string;
  background: string;
  label: string;
  icon: IconKey;
  prefix: string;
};

const TONES: Record<TransactionType, TransactionTone> = {
  INCOME: {
    foreground: desktopColors.income,
    background: desktopColors.incomeSoft,
    label: 'Receita',
    icon: 'income',
    prefix: '+ ',
  },
  EXPENSE: {
    foreground: desktopColors.expense,
    background: desktopColors.expenseSoft,
    label: 'Despesa',
    icon: 'expense',
    prefix: '− ',
  },
  TRANSFER: {
    foreground: desktopColors.transfer,
    background: desktopColors.transferSoft,
    label: 'Transferência',
    icon: 'transfer',
    prefix: '',
  },
};

const ROW_MENU_WIDTH = 172;
const ROW_MENU_HEIGHT = 96;

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
}) {
  const triggerRef = useRef<View>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [anchor, setAnchor] = useState({ x: 12, y: 12, width: 220 });
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const selected = options.find((option) => option.value === value);

  function openMenu() {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      const menuWidth = Math.max(width, 220);

      setAnchor({
        x: Math.min(
          Math.max(x, 12),
          Math.max(12, windowWidth - menuWidth - 12),
        ),
        y: Math.min(y + height + 6, Math.max(12, windowHeight - 300)),
        width: menuWidth,
      });
      setMenuVisible(true);
    });
  }

  return (
    <View ref={triggerRef} collapsable={false} style={styles.filterField}>
      <Text style={styles.filterLabel}>{label}</Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? 'Selecionar'}`}
        onPress={openMenu}
        style={({ pressed }) => [
          styles.filterTrigger,
          pressed && styles.filterTriggerPressed,
        ]}
      >
        <Text style={styles.filterValue} numberOfLines={1}>
          {selected?.label ?? 'Selecionar'}
        </Text>
        <Icon
          name="chevronDown"
          size={16}
          color={desktopColors.textMuted}
        />
      </Pressable>

      <Modal
        transparent
        visible={menuVisible}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <View style={styles.overlay}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fechar opções"
            style={StyleSheet.absoluteFill}
            onPress={() => setMenuVisible(false)}
          />

          <View
            style={[
              styles.selectMenu,
              {
                left: anchor.x,
                top: anchor.y,
                width: anchor.width,
              },
            ]}
          >
            <ScrollView
              style={styles.selectMenuScroll}
              showsVerticalScrollIndicator={false}
            >
              {options.map((option) => {
                const isSelected = option.value === value;

                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => {
                      onChange(option.value);
                      setMenuVisible(false);
                    }}
                    style={({ pressed }) => [
                      styles.selectOption,
                      isSelected && styles.selectOptionSelected,
                      pressed && styles.selectOptionPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.selectOptionText,
                        isSelected && styles.selectOptionTextSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {option.label}
                    </Text>
                    {isSelected ? (
                      <Icon
                        name="check"
                        size={14}
                        color={desktopColors.primary}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function TransactionRow({
  transaction,
  isLast,
  onOpenMenu,
}: {
  transaction: DesktopTransaction;
  isLast: boolean;
  onOpenMenu: (
    event: GestureResponderEvent,
    transaction: DesktopTransaction,
  ) => void;
}) {
  const tone = TONES[transaction.type];
  const { hidden } = usePrivacy();
  const amount = maskMoney(
    `${tone.prefix}${formatCurrency(
      transaction.amount,
      transaction.currency,
    )}`,
    hidden,
  );

  return (
    <View style={[styles.row, isLast && styles.rowLast]}>
      <View style={styles.dateCell}>
        <Text style={styles.dateText}>{transaction.dateLabel}</Text>
        <Text style={styles.timeText}>{transaction.timeLabel}</Text>
      </View>

      <View style={styles.descriptionCell}>
        <View style={styles.descriptionLine}>
          <Text style={styles.descriptionText} numberOfLines={1}>
            {transaction.description}
          </Text>

          {transaction.isRecurring ? (
            <View
              accessibilityLabel="Transação gerada por recorrência"
              style={styles.recurringBadge}
            >
              <Icon
                name="recurring"
                size={10}
                color={desktopColors.primary}
              />
              <Text style={styles.recurringBadgeText}>Recorrente</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.categoryCell}>
        <Text style={styles.cellText} numberOfLines={1}>
          {transaction.category}
        </Text>
      </View>

      <View style={styles.accountCell}>
        <Text style={styles.cellText} numberOfLines={1}>
          {transaction.accountLabel}
        </Text>
      </View>

      <View style={styles.typeCell}>
        <View
          style={[
            styles.typeBadge,
            { backgroundColor: tone.background },
          ]}
        >
          <Icon name={tone.icon} size={12} color={tone.foreground} />
          <Text style={[styles.typeBadgeText, { color: tone.foreground }]}>
            {tone.label}
          </Text>
        </View>
      </View>

      <View style={styles.amountCell}>
        <Text
          style={[styles.amountText, { color: tone.foreground }]}
          numberOfLines={1}
        >
          {amount}
        </Text>
      </View>

      <View style={styles.actionsCell}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Ações de ${transaction.description}`}
          onPress={(event) => onOpenMenu(event, transaction)}
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

function Pagination({
  page,
  pageCount,
  total,
  rangeStart,
  rangeEnd,
  onChange,
}: {
  page: number;
  pageCount: number;
  total: number;
  rangeStart: number;
  rangeEnd: number;
  onChange: (page: number) => void;
}) {
  return (
    <View style={styles.pagination}>
      <Text style={styles.paginationInfo}>
        Mostrando {rangeStart}–{rangeEnd} de {total}{' '}
        {total === 1 ? 'transação' : 'transações'}
      </Text>

      <View style={styles.paginationControls}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Página anterior"
          accessibilityState={{ disabled: page <= 1 }}
          disabled={page <= 1}
          onPress={() => onChange(page - 1)}
          style={({ pressed }) => [
            styles.pageButton,
            page <= 1 && styles.pageButtonDisabled,
            pressed && page > 1 && styles.pageButtonPressed,
          ]}
        >
          <Icon
            name="chevronLeft"
            size={18}
            color={desktopColors.primary}
          />
        </Pressable>

        <Text style={styles.pageLabel}>
          Página {page} de {pageCount}
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Próxima página"
          accessibilityState={{ disabled: page >= pageCount }}
          disabled={page >= pageCount}
          onPress={() => onChange(page + 1)}
          style={({ pressed }) => [
            styles.pageButton,
            page >= pageCount && styles.pageButtonDisabled,
            pressed && page < pageCount && styles.pageButtonPressed,
          ]}
        >
          <Icon
            name="chevronRight"
            size={18}
            color={desktopColors.primary}
          />
        </Pressable>
      </View>
    </View>
  );
}

export function DesktopTransactions() {
  const { showToast } = useFeedback();
  const { deleteTransaction } = useTransactions();

  const {
    accounts,
    activeAccounts,
    categories,
    pagination,
    totalCount,
    isInitialLoading,
    refreshing,
    errorMessage,
    refreshAll,
    query,
    setQuery,
    period,
    setPeriod,
    accountId,
    setAccountId,
    categoryId,
    setCategoryId,
    type,
    setType,
    customStart,
    setCustomStart,
    customEnd,
    setCustomEnd,
    hasActiveFilters,
    clearFilters,
    setPage,
  } = useDesktopTransactions();

  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const [formVisible, setFormVisible] = useState(false);
  const [formMode, setFormMode] = useState<TransactionFormMode>('create');
  const [editingTransactionId, setEditingTransactionId] = useState<
    string | null
  >(null);

  const [menuAnchor, setMenuAnchor] = useState<{
    transaction: DesktopTransaction;
    left: number;
    top: number;
  } | null>(null);

  const [deleteTarget, setDeleteTarget] =
    useState<DesktopTransaction | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const accountOptions = useMemo<SelectOption[]>(
    () => [
      { label: 'Todas as contas', value: 'all' },
      ...accounts.map((account) => ({
        label: account.name,
        value: account.id,
      })),
    ],
    [accounts],
  );

  const categoryOptions = useMemo<SelectOption[]>(
    () => [
      { label: 'Todas as categorias', value: 'all' },
      { label: 'Sem categoria', value: 'uncategorized' },
      ...categories.map((category) => ({
        label: category.name,
        value: category.id,
      })),
    ],
    [categories],
  );

  function openCreate() {
    if (activeAccounts.length === 0) {
      showToast({
        variant: 'warning',
        title: 'Nenhuma conta ativa',
        message: 'Crie ou reative uma conta antes de registrar uma transação.',
      });
      return;
    }

    setFormMode('create');
    setEditingTransactionId(null);
    setFormVisible(true);
  }

  function openEdit(transactionId: string) {
    setFormMode('edit');
    setEditingTransactionId(transactionId);
    setFormVisible(true);
  }

  function openRowMenu(
    event: GestureResponderEvent,
    transaction: DesktopTransaction,
  ) {
    const { pageX, pageY } = event.nativeEvent;

    setMenuAnchor({
      transaction,
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

  function requestDelete(transaction: DesktopTransaction) {
    setDeleteError(null);
    setDeleteTarget(transaction);
  }

  async function confirmDelete() {
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

  const emptyMessage = hasActiveFilters
    ? 'Nenhuma transação para os filtros selecionados'
    : 'Nenhuma transação registrada';

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.pageHeader}>
        <View style={styles.heading}>
          <Text style={styles.title}>Transações</Text>
          <Text style={styles.subtitle}>
            Pesquise, filtre e gerencie todas as movimentações das suas contas.
          </Text>
        </View>

        <View style={styles.headerActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Atualizar transações"
            disabled={refreshing}
            onPress={() => void refreshAll()}
            style={({ pressed }) => [
              styles.refreshButton,
              pressed && styles.refreshButtonPressed,
              refreshing && styles.refreshButtonDisabled,
            ]}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={desktopColors.primary} />
            ) : (
              <Icon
                name="refresh"
                size={16}
                color={desktopColors.primary}
              />
            )}
            <Text style={styles.refreshLabel}>
              {refreshing ? 'Atualizando' : 'Atualizar'}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Nova transação"
            onPress={openCreate}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
            ]}
          >
            <Icon name="add" size={16} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Nova transação</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.filtersCard}>
        <View style={styles.filtersRow}>
          <View id="search-field-transactions" style={styles.searchField}>
            <Icon
              name="search"
              size={18}
              color={desktopColors.textMuted}
              style={styles.searchIcon}
            />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Pesquisar por descrição"
              placeholderTextColor={desktopColors.textMuted}
              style={styles.searchInput}
              accessibilityLabel="Pesquisar transações por descrição"
              returnKeyType="search"
            />
            {query.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Limpar pesquisa"
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

          <FilterSelect
            label="Período"
            value={period}
            options={PERIOD_OPTIONS}
            onChange={(value) => setPeriod(value as PeriodFilter)}
          />

          <FilterSelect
            label="Conta"
            value={accountId}
            options={accountOptions}
            onChange={setAccountId}
          />

          <FilterSelect
            label="Categoria"
            value={categoryId}
            options={categoryOptions}
            onChange={setCategoryId}
          />
        </View>

        {period === 'custom' ? (
          <View style={styles.customRange}>
            <View style={styles.customField}>
              <Text style={styles.filterLabel}>Data inicial</Text>
              <DatePickerField
                value={customStart}
                onChange={setCustomStart}
                accessibilityLabel="Data inicial do período"
              />
            </View>

            <View style={styles.customField}>
              <Text style={styles.filterLabel}>Data final</Text>
              <DatePickerField
                value={customEnd}
                onChange={setCustomEnd}
                accessibilityLabel="Data final do período"
              />
            </View>
          </View>
        ) : null}

        <View style={styles.filtersFooter}>
          <View style={styles.typeGroup}>
            {TYPE_OPTIONS.map((option) => {
              const isSelected = type === option.value;

              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  onPress={() =>
                    setType(option.value as TransactionTypeFilter)
                  }
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
          ) : (
            <Text style={styles.filterHint}>
              {totalCount}{' '}
              {totalCount === 1 ? 'transação carregada' : 'transações carregadas'}
            </Text>
          )}
        </View>
      </View>

      {errorMessage ? (
        <InlineFeedback
          variant="error"
          title="Não foi possível atualizar as transações"
          message={errorMessage}
        />
      ) : null}

      {isInitialLoading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={desktopColors.primary} />
          <Text style={styles.loadingText}>Carregando transações...</Text>
        </View>
      ) : (
        <View style={styles.tableCard}>
          <View style={styles.tableHeader}>
            <View style={styles.tableHeading}>
              <Text style={styles.tableTitle}>Histórico</Text>
              <Text style={styles.tableSubtitle}>
                {hasActiveFilters
                  ? `${pagination.total} de ${totalCount} transações após os filtros`
                  : `${totalCount} ${
                      totalCount === 1 ? 'transação' : 'transações'
                    } no total`}
              </Text>
            </View>
          </View>

          {totalCount === 0 ? (
            <View style={styles.emptyState}>
              <Icon
                name="transfer"
                size={30}
                color={desktopColors.primary}
                style={styles.emptyIcon}
              />
              <Text style={styles.emptyTitle}>{emptyMessage}</Text>
              <Text style={styles.emptyText}>
                Registre sua primeira movimentação para começar a acompanhar
                suas finanças.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={openCreate}
                style={({ pressed }) => [
                  styles.emptyButton,
                  pressed && styles.emptyButtonPressed,
                ]}
              >
                <Icon name="add" size={14} color={desktopColors.primary} />
                <Text style={styles.emptyButtonText}>Nova transação</Text>
              </Pressable>
            </View>
          ) : pagination.total === 0 ? (
            <View style={styles.emptyState}>
              <Icon
                name="searchOff"
                size={30}
                color={desktopColors.primary}
                style={styles.emptyIcon}
              />
              <Text style={styles.emptyTitle}>{emptyMessage}</Text>
              <Text style={styles.emptyText}>
                Ajuste os filtros ou limpe-os para ver todas as movimentações.
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
                <Text style={[styles.headCell, styles.dateCell]}>Data</Text>
                <Text style={[styles.headCell, styles.descriptionCell]}>
                  Descrição
                </Text>
                <Text style={[styles.headCell, styles.categoryCell]}>
                  Categoria
                </Text>
                <Text style={[styles.headCell, styles.accountCell]}>
                  Conta
                </Text>
                <Text style={[styles.headCell, styles.typeCell]}>Tipo</Text>
                <Text style={[styles.headCell, styles.amountHeader]}>
                  Valor
                </Text>
                <View style={styles.actionsCell} />
              </View>

              {pagination.items.map((transaction, index) => (
                <TransactionRow
                  key={transaction.id}
                  transaction={transaction}
                  isLast={index === pagination.items.length - 1}
                  onOpenMenu={openRowMenu}
                />
              ))}

              {pagination.pageCount > 1 ? (
                <Pagination
                  page={pagination.page}
                  pageCount={pagination.pageCount}
                  total={pagination.total}
                  rangeStart={pagination.rangeStart}
                  rangeEnd={pagination.rangeEnd}
                  onChange={setPage}
                />
              ) : null}
            </>
          )}
        </View>
      )}

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
                {
                  left: menuAnchor.left,
                  top: menuAnchor.top,
                },
              ]}
            >
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  const { transaction } = menuAnchor;
                  setMenuAnchor(null);
                  openEdit(transaction.id);
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
                  requestDelete(transaction);
                }}
                style={({ pressed }) => [
                  styles.rowMenuItem,
                  pressed && styles.rowMenuItemPressed,
                ]}
              >
                <Icon
                  name="delete"
                  size={15}
                  color={desktopColors.expense}
                />
                <Text
                  style={[styles.rowMenuText, styles.rowMenuDangerText]}
                >
                  Excluir
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </Modal>

      <ConfirmDialog
        visible={deleteTarget !== null}
        title="Excluir transação?"
        message={
          deleteTarget
            ? `Deseja excluir "${deleteTarget.description}"? Essa operação ` +
              'também reverterá o efeito da transação no saldo da conta, ' +
              'quando aplicável.'
            : ''
        }
        confirmLabel="Excluir"
        tone="danger"
        loading={deleting}
        error={deleteError}
        onConfirm={() => void confirmDelete()}
        onCancel={() => {
          if (deleting) return;
          setDeleteTarget(null);
          setDeleteError(null);
        }}
      />

      {formVisible ? (
        <TransactionFormModal
          mode={formMode}
          transactionId={editingTransactionId}
          accounts={accounts}
          categories={categories}
          variant="desktop"
          onClose={() => setFormVisible(false)}
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
  refreshButtonDisabled: {
    opacity: 0.72,
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
  filtersCard: {
    backgroundColor: desktopColors.surface,
    borderRadius: desktopLayout.radius,
    borderWidth: 1,
    borderColor: desktopColors.border,
    padding: 18,
    gap: 14,
    ...desktopShadows.card,
  },
  filtersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    gap: 12,
  },
  searchField: {
    flexGrow: 2,
    flexBasis: 260,
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
  filterField: {
    flexGrow: 1,
    flexBasis: 170,
    minWidth: 160,
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
  filterTrigger: {
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: desktopColors.border,
    backgroundColor: desktopColors.surface,
  },
  filterTriggerPressed: {
    backgroundColor: desktopColors.surfaceMuted,
  },
  filterValue: {
    flex: 1,
    minWidth: 0,
    color: desktopColors.text,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: desktopFont,
  },
  customRange: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  customField: {
    flexGrow: 1,
    flexBasis: 200,
    maxWidth: 260,
    gap: 6,
  },
  filtersFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
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
  filterHint: {
    color: desktopColors.textMuted,
    fontSize: 11,
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
  tableHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  dateCell: {
    width: 104,
    flexShrink: 0,
  },
  descriptionCell: {
    flexGrow: 2.2,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
  },
  categoryCell: {
    flexGrow: 1.2,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
  },
  accountCell: {
    flexGrow: 1.4,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
  },
  typeCell: {
    width: 126,
    flexShrink: 0,
  },
  amountCell: {
    width: 142,
    flexShrink: 0,
    alignItems: 'flex-end',
  },
  actionsCell: {
    width: 36,
    flexShrink: 0,
    alignItems: 'flex-end',
  },
  amountHeader: {
    textAlign: 'right',
    width: 142,
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
  descriptionLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  descriptionText: {
    flexShrink: 1,
    color: desktopColors.text,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: desktopFont,
  },
  recurringBadge: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: desktopColors.primarySoft,
  },
  recurringBadgeText: {
    color: desktopColors.primary,
    fontSize: 9,
    fontWeight: '700',
    fontFamily: desktopFont,
  },
  cellText: {
    color: desktopColors.textSecondary,
    fontSize: 12,
    fontFamily: desktopFont,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: desktopFont,
  },
  amountText: {
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    fontFamily: desktopFont,
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
  emptyIcon: {
    marginBottom: 10,
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
    backgroundColor: desktopColors.primary,
  },
  emptyButtonText: {
    color: desktopColors.primary,
    fontSize: 11,
    fontWeight: '800',
    fontFamily: desktopFont,
  },
  pagination: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: desktopColors.border,
  },
  paginationInfo: {
    color: desktopColors.textSecondary,
    fontSize: 11,
    fontFamily: desktopFont,
  },
  paginationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pageButton: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageButtonPressed: {
    backgroundColor: desktopColors.surfaceMuted,
  },
  pageButtonDisabled: {
    opacity: 0.32,
  },
  pageLabel: {
    minWidth: 104,
    textAlign: 'center',
    color: desktopColors.text,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: desktopFont,
  },
  overlay: {
    flex: 1,
  },
  selectMenu: {
    position: 'absolute',
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: desktopColors.border,
    backgroundColor: desktopColors.surface,
    ...desktopShadows.popover,
  },
  selectMenuScroll: {
    maxHeight: 280,
  },
  selectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  selectOptionSelected: {
    backgroundColor: desktopColors.primarySoft,
  },
  selectOptionPressed: {
    backgroundColor: desktopColors.surfaceMuted,
  },
  selectOptionText: {
    flex: 1,
    color: desktopColors.text,
    fontSize: 12,
    fontFamily: desktopFont,
  },
  selectOptionTextSelected: {
    color: desktopColors.primary,
    fontWeight: '700',
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
  rowMenuDangerText: {
    color: desktopColors.expense,
  },
});

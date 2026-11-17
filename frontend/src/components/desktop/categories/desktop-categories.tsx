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

import { DesktopCategoryFormModal } from '@/components/desktop/categories/desktop-category-form-modal';
import {
  desktopColors,
  desktopFont,
  desktopLayout,
  desktopShadows,
} from '@/components/desktop/desktop-theme';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { InlineFeedback } from '@/components/feedback/inline-feedback';
import { useFeedback } from '@/contexts/feedback-context';
import { useTransactions } from '@/contexts/transactions-context';
import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
  type Category,
} from '@/services/categories-api';
import {
  buildCategoryUsage,
  groupCategoriesByUsage,
} from '@/utils/category-usage';

const ICONS = {
  add: { ios: 'plus', android: 'add', web: 'add' },
  close: { ios: 'xmark', android: 'close', web: 'close' },
  search: {
    ios: 'magnifyingglass',
    android: 'search',
    web: 'search',
  },
  more: { ios: 'ellipsis', android: 'more_horiz', web: 'more_horiz' },
  edit: { ios: 'square.and.pencil', android: 'edit', web: 'edit' },
  remove: { ios: 'trash', android: 'delete_outline', web: 'delete_outline' },
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
  category: { ios: 'tag', android: 'label', web: 'label' },
  unused: { ios: 'tray', android: 'inventory_2', web: 'inventory_2' },
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

type SectionTone = {
  color: string;
  background: string;
};

const TONES: Record<'income' | 'expense' | 'neutral', SectionTone> = {
  income: {
    color: desktopColors.income,
    background: desktopColors.incomeSoft,
  },
  expense: {
    color: desktopColors.expense,
    background: desktopColors.expenseSoft,
  },
  neutral: {
    color: desktopColors.textSecondary,
    background: desktopColors.surfaceMuted,
  },
};

type CategorySectionProps = {
  title: string;
  caption: string;
  icon: IconKey;
  tone: SectionTone;
  categories: Category[];
  metaFor: (category: Category) => string;
  emptyText: string;
  disabled: boolean;
  onOpenMenu: (event: GestureResponderEvent, category: Category) => void;
};

const MENU_WIDTH = 160;
const MENU_HEIGHT = 104;

type MenuAnchor = {
  category: Category;
  left: number;
  top: number;
};

type FormTarget =
  | { mode: 'create' }
  | { mode: 'edit'; category: Category }
  | null;

function CategorySection({
  title,
  caption,
  icon,
  tone,
  categories,
  metaFor,
  emptyText,
  disabled,
  onOpenMenu,
}: CategorySectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <View
            style={[styles.sectionIcon, { backgroundColor: tone.background }]}
          >
            <Icon name={icon} size={16} color={tone.color} />
          </View>
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>

        <Text style={styles.sectionCount}>
          {categories.length === 0
            ? 'Nenhuma'
            : `${categories.length} ${
                categories.length === 1 ? 'categoria' : 'categorias'
              }`}
        </Text>
      </View>

      <Text style={styles.sectionCaption}>{caption}</Text>

      <View style={styles.listCard}>
        {categories.length === 0 ? (
          <View style={styles.sectionEmpty}>
            <Text style={styles.sectionEmptyText}>{emptyText}</Text>
          </View>
        ) : (
          categories.map((category, index) => (
            <View
              key={category.id}
              style={[
                styles.row,
                index === categories.length - 1 && styles.rowLast,
              ]}
            >
              <View
                style={[styles.rowIcon, { backgroundColor: tone.background }]}
              >
                <Icon name="category" size={15} color={tone.color} />
              </View>

              <View style={styles.rowBody}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {category.name}
                </Text>
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {metaFor(category)}
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Ações da categoria ${category.name}`}
                disabled={disabled}
                onPress={(event) => onOpenMenu(event, category)}
                style={({ pressed }) => [
                  styles.moreButton,
                  pressed && styles.moreButtonPressed,
                  disabled && styles.buttonDisabled,
                ]}
              >
                <Icon
                  name="more"
                  size={18}
                  color={desktopColors.textSecondary}
                />
              </Pressable>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

export function DesktopCategories() {
  const { showToast } = useFeedback();
  const {
    transactions,
    loading: transactionsLoading,
    error: transactionsError,
    refreshTransactions,
  } = useTransactions();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');

  const [formTarget, setFormTarget] = useState<FormTarget>(null);
  const [menuAnchor, setMenuAnchor] = useState<MenuAnchor | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const hasLoadedRef = useRef(false);

  const loadCategories = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setLoading(true);
    }

    setLoadError('');

    try {
      setCategories(await getCategories());
    } catch (cause) {
      setLoadError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível carregar as categorias.',
      );
    } finally {
      hasLoadedRef.current = true;

      if (!options?.silent) {
        setLoading(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadCategories({ silent: hasLoadedRef.current });
      void refreshTransactions({ silent: true }).catch(() => {
        // O erro fica disponível no contexto de transações.
      });
    }, [loadCategories, refreshTransactions]),
  );

  // O backend não possui tipo de categoria. O agrupamento usa o tipo real das
  // transações que referenciam cada categoria, sem persistir dados derivados.
  const usageByCategoryId = useMemo(
    () => buildCategoryUsage(transactions),
    [transactions],
  );

  const visibleCategories = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR');

    return categories
      .filter((category) =>
        category.name.toLocaleLowerCase('pt-BR').includes(normalizedSearch),
      )
      .sort((first, second) =>
        first.name.localeCompare(second.name, 'pt-BR'),
      );
  }, [categories, search]);

  const groupedCategories = useMemo(
    () => groupCategoriesByUsage(visibleCategories, usageByCategoryId),
    [usageByCategoryId, visibleCategories],
  );

  const actionsDisabled = loading || deleting;
  const isInitialLoading =
    loading || (transactionsLoading && transactions.length === 0);

  const searching = search.trim().length > 0;

  function openCreateForm() {
    if (actionsDisabled) {
      return;
    }

    setFormTarget({ mode: 'create' });
  }

  function openEditForm(category: Category) {
    if (actionsDisabled) {
      return;
    }

    setFormTarget({ mode: 'edit', category });
  }

  function openRowMenu(event: GestureResponderEvent, category: Category) {
    if (actionsDisabled) {
      return;
    }

    const { pageX, pageY } = event.nativeEvent;

    setMenuAnchor({
      category,
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

  async function submitCategory(name: string) {
    const target = formTarget;

    if (!target) {
      return;
    }

    if (target.mode === 'edit') {
      await updateCategory(target.category.id, { name });
    } else {
      await createCategory({ name });
    }

    await loadCategories({ silent: true });

    showToast({
      variant: 'success',
      title:
        target.mode === 'edit' ? 'Categoria atualizada' : 'Categoria criada',
      message:
        target.mode === 'edit'
          ? 'As alterações foram salvas.'
          : 'A categoria já está disponível para uso.',
    });
  }

  async function confirmDeletion() {
    if (!deleteTarget || deleting) {
      return;
    }

    const category = deleteTarget;

    setDeleting(true);
    setDeleteError('');

    try {
      await deleteCategory(category.id);
      setDeleteTarget(null);

      await loadCategories({ silent: true });

      showToast({
        variant: 'success',
        title: 'Categoria excluída',
        message: 'A categoria foi removida com sucesso.',
      });
    } catch (cause) {
      setDeleteError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível excluir a categoria. Tente novamente.',
      );
    } finally {
      setDeleting(false);
    }
  }

  function closeDeletionDialog() {
    if (deleting) {
      return;
    }

    setDeleteTarget(null);
    setDeleteError('');
  }

  function retryLoading() {
    void loadCategories();
    void refreshTransactions({ silent: true }).catch(() => {
      // O erro fica disponível no contexto de transações.
    });
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.pageHeader}>
        <View style={styles.heading}>
          <Text style={styles.title}>Categorias</Text>
          <Text style={styles.subtitle}>
            Organize as categorias usadas nas suas receitas e despesas.
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Nova categoria"
          disabled={actionsDisabled}
          onPress={openCreateForm}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.primaryButtonPressed,
            actionsDisabled && styles.buttonDisabled,
          ]}
        >
          <Icon name="add" size={16} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>Nova categoria</Text>
        </Pressable>
      </View>

      <Text style={styles.groupingHint}>
        As categorias são agrupadas pelo tipo das transações em que são usadas.
      </Text>

      {transactionsError ? (
        <InlineFeedback
          variant="error"
          title="Não foi possível atualizar as movimentações"
          message="O agrupamento por uso pode estar incompleto. Tente atualizar novamente."
        />
      ) : null}

      {loadError ? (
        <InlineFeedback
          variant="error"
          title="Não foi possível atualizar as categorias"
          message={loadError}
        />
      ) : null}

      {isInitialLoading ? (
        <View style={styles.stateCard}>
          <ActivityIndicator size="large" color={desktopColors.primary} />
          <Text style={styles.stateText}>Carregando categorias...</Text>
        </View>
      ) : loadError && categories.length === 0 ? (
        <View style={styles.stateCard}>
          <View style={styles.stateIcon}>
            <Icon name="category" size={26} color={desktopColors.primary} />
          </View>
          <Text style={styles.stateTitle}>
            Não foi possível carregar as categorias
          </Text>
          <Text style={styles.stateText}>{loadError}</Text>

          <Pressable
            accessibilityRole="button"
            onPress={retryLoading}
            style={({ pressed }) => [
              styles.stateButton,
              pressed && styles.stateButtonPressed,
            ]}
          >
            <Text style={styles.stateButtonText}>Tentar novamente</Text>
          </Pressable>
        </View>
      ) : categories.length === 0 ? (
        <View style={styles.stateCard}>
          <View style={styles.stateIcon}>
            <Icon name="category" size={26} color={desktopColors.primary} />
          </View>
          <Text style={styles.stateTitle}>Nenhuma categoria cadastrada</Text>
          <Text style={styles.stateText}>
            Crie categorias para organizar suas receitas e despesas.
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={openCreateForm}
            style={({ pressed }) => [
              styles.stateButton,
              pressed && styles.stateButtonPressed,
            ]}
          >
            <Icon name="add" size={14} color={desktopColors.primary} />
            <Text style={styles.stateButtonText}>Nova categoria</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.toolbar}>
            <View id="search-field-categories" style={styles.searchField}>
              <Icon
                name="search"
                size={18}
                color={desktopColors.textMuted}
                style={styles.searchIcon}
              />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Buscar pelo nome da categoria"
                placeholderTextColor={desktopColors.textMuted}
                style={styles.searchInput}
                accessibilityLabel="Buscar categorias"
                returnKeyType="search"
                autoCapitalize="none"
              />
              {search.length > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Limpar busca"
                  onPress={() => setSearch('')}
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

            <Text style={styles.toolbarHint}>
              {visibleCategories.length}{' '}
              {visibleCategories.length === 1 ? 'categoria' : 'categorias'}
              {searching ? ' encontradas' : ' cadastradas'}
            </Text>
          </View>

          {visibleCategories.length === 0 ? (
            <View style={styles.stateCard}>
              <View style={styles.stateIcon}>
                <Icon name="search" size={26} color={desktopColors.primary} />
              </View>
              <Text style={styles.stateTitle}>Nenhuma categoria encontrada</Text>
              <Text style={styles.stateText}>
                Tente buscar por outro nome.
              </Text>

              <Pressable
                accessibilityRole="button"
                onPress={() => setSearch('')}
                style={({ pressed }) => [
                  styles.stateButton,
                  pressed && styles.stateButtonPressed,
                ]}
              >
                <Text style={styles.stateButtonText}>Limpar busca</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.sectionsGrid}>
                <CategorySection
                  title="Receitas"
                  caption="Categorias usadas em transações de receita."
                  icon="income"
                  tone={TONES.income}
                  categories={groupedCategories.income}
                  metaFor={(category) =>
                    usageByCategoryId.get(category.id)?.expense
                      ? 'Usada em receitas e despesas'
                      : 'Usada em receitas'
                  }
                  emptyText={
                    searching
                      ? 'Nenhuma categoria encontrada nesta seção.'
                      : 'Nenhuma categoria usada em receitas.'
                  }
                  disabled={actionsDisabled}
                  onOpenMenu={openRowMenu}
                />

                <CategorySection
                  title="Despesas"
                  caption="Categorias usadas em transações de despesa."
                  icon="expense"
                  tone={TONES.expense}
                  categories={groupedCategories.expense}
                  metaFor={(category) =>
                    usageByCategoryId.get(category.id)?.income
                      ? 'Usada em receitas e despesas'
                      : 'Usada em despesas'
                  }
                  emptyText={
                    searching
                      ? 'Nenhuma categoria encontrada nesta seção.'
                      : 'Nenhuma categoria usada em despesas.'
                  }
                  disabled={actionsDisabled}
                  onOpenMenu={openRowMenu}
                />
              </View>

              {groupedCategories.unused.length > 0 ? (
                <CategorySection
                  title="Sem movimentações"
                  caption="Categorias ainda não usadas em receitas ou despesas."
                  icon="unused"
                  tone={TONES.neutral}
                  categories={groupedCategories.unused}
                  metaFor={() => 'Sem movimentações registradas'}
                  emptyText="Nenhuma categoria encontrada nesta seção."
                  disabled={actionsDisabled}
                  onOpenMenu={openRowMenu}
                />
              ) : null}
            </>
          )}
        </>
      )}

      <Text style={styles.disclaimer}>
        As categorias são carregadas do backend da Finora.
      </Text>

      {formTarget ? (
        <DesktopCategoryFormModal
          mode={formTarget.mode}
          category={formTarget.mode === 'edit' ? formTarget.category : null}
          categories={categories}
          onClose={() => setFormTarget(null)}
          onSubmit={submitCategory}
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
                  const { category } = menuAnchor;
                  setMenuAnchor(null);
                  openEditForm(category);
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
                  const { category } = menuAnchor;
                  setMenuAnchor(null);
                  setDeleteError('');
                  setDeleteTarget(category);
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
        visible={Boolean(deleteTarget)}
        title="Excluir categoria?"
        message={
          deleteTarget
            ? `Deseja excluir a categoria "${deleteTarget.name}"? Essa ação não poderá ser desfeita.`
            : ''
        }
        confirmLabel="Excluir"
        tone="danger"
        loading={deleting}
        error={deleteError}
        onConfirm={() => void confirmDeletion()}
        onCancel={closeDeletionDialog}
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
  groupingHint: {
    marginTop: -8,
    color: desktopColors.textMuted,
    fontSize: 11,
    fontFamily: desktopFont,
  },
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  searchField: {
    flexGrow: 1,
    flexBasis: 280,
    maxWidth: 460,
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
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
    paddingVertical: 10,
    fontFamily: desktopFont,
  },
  clearSearch: {
    paddingLeft: 8,
  },
  toolbarHint: {
    color: desktopColors.textMuted,
    fontSize: 11,
    fontFamily: desktopFont,
  },
  sectionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: 20,
  },
  section: {
    flexGrow: 1,
    flexBasis: 380,
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  sectionIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    color: desktopColors.text,
    fontSize: 15,
    fontWeight: '800',
    fontFamily: desktopFont,
  },
  sectionCount: {
    color: desktopColors.textMuted,
    fontSize: 10,
    fontWeight: '600',
    fontFamily: desktopFont,
  },
  sectionCaption: {
    marginTop: -3,
    color: desktopColors.textMuted,
    fontSize: 10,
    lineHeight: 15,
    fontFamily: desktopFont,
  },
  listCard: {
    marginTop: 2,
    borderRadius: desktopLayout.radius,
    borderWidth: 1,
    borderColor: desktopColors.border,
    backgroundColor: desktopColors.surface,
    overflow: 'hidden',
    ...desktopShadows.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: desktopColors.border,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  rowName: {
    color: desktopColors.text,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: desktopFont,
  },
  rowMeta: {
    marginTop: 2,
    color: desktopColors.textMuted,
    fontSize: 10,
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
  sectionEmpty: {
    paddingHorizontal: 16,
    paddingVertical: 22,
  },
  sectionEmptyText: {
    color: desktopColors.textMuted,
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
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

import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
  type Category,
} from '@/services/categories-api';

const colors = {
  background: '#F7F8F5',
  surface: '#FFFFFF',
  primary: '#176B52',
  primaryLight: '#E8F3ED',
  text: '#202923',
  secondary: '#788078',
  border: '#E9ECE7',
  danger: '#B84D4D',
  dangerLight: '#F9EDEC',
  input: '#FAFBF9',
};

type CategoryForm = {
  name: string;
};

const emptyForm: CategoryForm = {
  name: '',
};

export default function CategoriesScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const mutationInProgressRef = useRef(false);

  const [search, setSearch] = useState('');

  const [formVisible, setFormVisible] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
      null,
  );
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [formError, setFormError] = useState('');

  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(
      null,
  );

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setLoadError('');

    try {
      const data = await getCategories();

      setCategories(data);
    } catch (error) {
      setLoadError(
          error instanceof Error
              ? error.message
              : 'Não foi possível carregar as categorias.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const actionsDisabled = loading || saving || deleting;

  const filteredCategories = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR');

    return categories.filter((category) =>
        category.name.toLocaleLowerCase('pt-BR').includes(normalizedSearch),
    );
  }, [categories, search]);

  const editingCategory = editingCategoryId
      ? categories.find((category) => category.id === editingCategoryId)
      : undefined;

  const deletingCategory = deletingCategoryId
      ? categories.find((category) => category.id === deletingCategoryId)
      : undefined;

  function showError(title: string, message: string) {
    Alert.alert(title, message);
  }

  function openCreateForm() {
    if (actionsDisabled || mutationInProgressRef.current) {
      return;
    }

    setEditingCategoryId(null);
    setForm(emptyForm);
    setFormError('');
    setFormVisible(true);
  }

  function openEditForm(category: Category) {
    if (actionsDisabled || mutationInProgressRef.current) {
      return;
    }

    setEditingCategoryId(category.id);
    setForm({ name: category.name });
    setFormError('');
    setFormVisible(true);
  }

  function closeForm() {
    if (saving) {
      return;
    }

    setFormVisible(false);
    setFormError('');
  }

  async function saveCategory() {
    if (mutationInProgressRef.current || loading) {
      return;
    }

    const name = form.name.trim();

    if (!name) {
      setFormError('Informe o nome da categoria.');
      return;
    }

    const duplicate = categories.some(
        (category) =>
            category.name.toLocaleLowerCase('pt-BR') ===
            name.toLocaleLowerCase('pt-BR') &&
            category.id !== editingCategoryId,
    );

    if (duplicate) {
      setFormError('Já existe uma categoria com esse nome.');
      return;
    }

    mutationInProgressRef.current = true;
    setSaving(true);
    setFormError('');

    try {
      if (editingCategoryId) {
        await updateCategory(editingCategoryId, { name });
      } else {
        await createCategory({ name });
      }

      setFormVisible(false);
      setForm(emptyForm);
      setEditingCategoryId(null);
      setSearch('');

      await loadCategories();
    } catch (error) {
      setFormError(
          error instanceof Error
              ? error.message
              : 'Não foi possível salvar a categoria.',
      );
    } finally {
      mutationInProgressRef.current = false;
      setSaving(false);
    }
  }

  async function confirmDeletion() {
    if (!deletingCategoryId || mutationInProgressRef.current || loading) {
      return;
    }

    const categoryId = deletingCategoryId;

    mutationInProgressRef.current = true;
    setDeleting(true);

    try {
      await deleteCategory(categoryId);

      setDeletingCategoryId((currentId) =>
          currentId === categoryId ? null : currentId,
      );

      await loadCategories();
    } catch (error) {
      showError(
          'Não foi possível excluir a categoria',
          error instanceof Error
              ? error.message
              : 'Ocorreu um erro. Tente novamente.',
      );
    } finally {
      mutationInProgressRef.current = false;
      setDeleting(false);
    }
  }

  function closeDeletionModal() {
    setDeletingCategoryId(null);
  }

  return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.eyebrow}>LEDGER</Text>

          <View style={styles.titleRow}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>Categorias</Text>
              <Text style={styles.description}>
                Organize e gerencie as categorias das suas movimentações
                financeiras.
              </Text>
            </View>

            <Pressable
                accessibilityRole="button"
                accessibilityLabel="Adicionar categoria"
                style={({ pressed }) => [
                  styles.addButton,
                  pressed && styles.pressed,
                  actionsDisabled && styles.disabledButton,
                ]}
                onPress={openCreateForm}
                disabled={actionsDisabled}
            >
              <Text style={styles.addButtonIcon}>＋</Text>
              <Text style={styles.addButtonText}>Nova</Text>
            </Pressable>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryIcon}>
              <Text style={styles.summaryIconText}>▦</Text>
            </View>

            <View style={styles.summaryContent}>
              <Text style={styles.summaryLabel}>Categorias cadastradas</Text>
              <Text style={styles.summaryAmount}>
                {categories.length}
              </Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Suas categorias</Text>
            <Text style={styles.sectionCaption}>
              {filteredCategories.length}{' '}
              {filteredCategories.length === 1 ? 'resultado' : 'resultados'}
            </Text>
          </View>

          <TextInput
              accessibilityLabel="Buscar categorias"
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Buscar pelo nome da categoria"
              placeholderTextColor={colors.secondary}
              returnKeyType="search"
              autoCapitalize="none"
          />

          {loading ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>Carregando categorias...</Text>
              </View>
          ) : loadError ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>
                  Não foi possível carregar as categorias
                </Text>
                <Text style={styles.emptyDescription}>{loadError}</Text>

                <Pressable
                    accessibilityRole="button"
                    style={[
                      styles.emptyAction,
                      loading && styles.disabledButton,
                    ]}
                    onPress={() => void loadCategories()}
                    disabled={loading}
                >
                  <Text style={styles.emptyActionText}>Tentar novamente</Text>
                </Pressable>
              </View>
          ) : filteredCategories.length > 0 ? (
              <View style={styles.categoriesList}>
                {filteredCategories.map((category, index) => (
                    <View
                        key={category.id}
                        style={[
                          styles.categoryCard,
                          index !== filteredCategories.length - 1 &&
                          styles.categoryCardSpacing,
                        ]}
                    >
                      <View style={styles.categoryHeader}>
                        <View style={styles.categoryIcon}>
                          <Text style={styles.categoryIconText}>#</Text>
                        </View>

                        <View style={styles.categoryDetails}>
                          <Text style={styles.categoryName} numberOfLines={2}>
                            {category.name}
                          </Text>
                          <Text style={styles.categoryCaption}>
                            Categoria financeira
                          </Text>
                        </View>
                      </View>

                      <View style={styles.categoryDivider} />

                      <View style={styles.categoryFooter}>
                        <Text style={styles.categoryFooterLabel}>
                          Gerenciar categoria
                        </Text>

                        <View style={styles.categoryActions}>
                          <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`Editar ${category.name}`}
                              style={[
                                styles.secondaryButton,
                                actionsDisabled && styles.disabledButton,
                              ]}
                              onPress={() => openEditForm(category)}
                              disabled={actionsDisabled}
                          >
                            <Text style={styles.secondaryButtonText}>Editar</Text>
                          </Pressable>

                          <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`Excluir ${category.name}`}
                              style={[
                                styles.deleteButton,
                                actionsDisabled && styles.disabledButton,
                              ]}
                              onPress={() => setDeletingCategoryId(category.id)}
                              disabled={actionsDisabled}
                          >
                            <Text style={styles.deleteButtonText}>Excluir</Text>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                ))}
              </View>
          ) : (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIcon}>
                  <Text style={styles.emptyIconText}>#</Text>
                </View>

                <Text style={styles.emptyTitle}>
                  {search.trim()
                      ? 'Nenhuma categoria encontrada'
                      : 'Nenhuma categoria cadastrada'}
                </Text>

                <Text style={styles.emptyDescription}>
                  {search.trim()
                      ? 'Tente buscar por outro nome.'
                      : 'Crie sua primeira categoria para organizar suas movimentações financeiras.'}
                </Text>

                {!search.trim() && (
                    <Pressable
                        accessibilityRole="button"
                        style={styles.emptyAction}
                        onPress={openCreateForm}
                    >
                      <Text style={styles.emptyActionText}>
                        Adicionar categoria
                      </Text>
                    </Pressable>
                )}
              </View>
          )}

          <Text style={styles.disclaimer}>
            As categorias são carregadas do backend do Ledger.
          </Text>
        </ScrollView>

        <Modal
            visible={formVisible}
            transparent
            animationType="fade"
            onRequestClose={closeForm}
        >
          <KeyboardAvoidingView
              style={styles.modalOverlay}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleContainer}>
                  <Text style={styles.modalTitle}>
                    {editingCategoryId ? 'Editar categoria' : 'Nova categoria'}
                  </Text>
                  <Text style={styles.modalDescription}>
                    {editingCategoryId
                        ? 'Atualize o nome da categoria.'
                        : 'Informe um nome para identificar a categoria.'}
                  </Text>
                </View>

                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Fechar formulário"
                    style={styles.closeButton}
                    onPress={closeForm}
                    disabled={saving}
                >
                  <Text style={styles.closeButtonText}>×</Text>
                </Pressable>
              </View>

              <Text style={styles.fieldLabel}>Nome da categoria</Text>

              <TextInput
                  accessibilityLabel="Nome da categoria"
                  style={styles.textInput}
                  value={form.name}
                  onChangeText={(name) => {
                    setForm((current) => ({ ...current, name }));
                    setFormError('');
                  }}
                  placeholder="Ex.: Alimentação"
                  placeholderTextColor={colors.secondary}
                  autoCapitalize="sentences"
                  maxLength={80}
                  returnKeyType="done"
                  onSubmitEditing={() => void saveCategory()}
                  editable={!saving}
                  autoFocus
              />

              {formError ? (
                  <Text accessibilityRole="alert" style={styles.formError}>
                    {formError}
                  </Text>
              ) : null}

              <View style={styles.modalActions}>
                <Pressable
                    accessibilityRole="button"
                    style={[
                      styles.cancelButton,
                      saving && styles.disabledButton,
                    ]}
                    onPress={closeForm}
                    disabled={saving}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </Pressable>

                <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ disabled: saving, busy: saving }}
                    style={[
                      styles.saveButton,
                      saving && styles.disabledButton,
                    ]}
                    onPress={() => void saveCategory()}
                    disabled={saving}
                >
                  <Text style={styles.saveButtonText}>
                    {saving
                        ? 'Salvando...'
                        : editingCategoryId
                            ? 'Salvar alterações'
                            : 'Criar categoria'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        <Modal
            visible={Boolean(deletingCategory)}
            transparent
            animationType="fade"
            onRequestClose={closeDeletionModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.confirmCard}>
              <View style={styles.confirmIcon}>
                <Text style={styles.confirmIconText}>!</Text>
              </View>

              <Text style={styles.confirmTitle}>Excluir categoria?</Text>

              <Text style={styles.confirmDescription}>
                {deletingCategory
                    ? `Deseja excluir a categoria "${deletingCategory.name}"? Essa ação não poderá ser desfeita.`
                    : ''}
              </Text>

              <View style={styles.modalActions}>
                <Pressable
                    accessibilityRole="button"
                    style={styles.cancelButton}
                    onPress={closeDeletionModal}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </Pressable>

                <Pressable
                    accessibilityRole="button"
                    accessibilityState={{
                      disabled: deleting,
                      busy: deleting,
                    }}
                    style={[
                      styles.dangerConfirmButton,
                      deleting && styles.disabledButton,
                    ]}
                    onPress={() => void confirmDeletion()}
                    disabled={deleting}
                >
                  <Text style={styles.dangerConfirmButtonText}>
                    {deleting ? 'Excluindo...' : 'Excluir'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
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
    paddingTop: 28,
    paddingBottom: 28,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.7,
  },
  description: {
    color: colors.secondary,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    marginBottom: 24,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 13,
    paddingHorizontal: 13,
    paddingVertical: 11,
    marginTop: 3,
    gap: 5,
  },
  addButtonIcon: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '500',
    lineHeight: 20,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.75,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 20,
    marginBottom: 30,
  },
  summaryIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryIconText: {
    color: colors.primary,
    fontSize: 24,
    fontWeight: '600',
  },
  summaryContent: {
    flex: 1,
  },
  summaryLabel: {
    color: colors.secondary,
    fontSize: 12,
    fontWeight: '500',
  },
  summaryAmount: {
    color: colors.text,
    fontSize: 25,
    fontWeight: '700',
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  sectionCaption: {
    color: colors.secondary,
    fontSize: 12,
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 15,
    paddingVertical: 13,
    fontSize: 14,
    color: colors.text,
    marginBottom: 18,
  },
  categoriesList: {
    gap: 12,
  },
  categoryCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 17,
  },
  categoryCardSpacing: {
    marginBottom: 0,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIconText: {
    color: colors.primary,
    fontSize: 23,
    fontWeight: '600',
  },
  categoryDetails: {
    flex: 1,
  },
  categoryName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  categoryCaption: {
    color: colors.secondary,
    fontSize: 12,
    marginTop: 4,
  },
  categoryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 16,
  },
  categoryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  categoryFooterLabel: {
    flex: 1,
    color: colors.secondary,
    fontSize: 11,
  },
  categoryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 8,
    backgroundColor: colors.surface,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
  },
  deleteButton: {
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 8,
    backgroundColor: colors.dangerLight,
  },
  deleteButtonText: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: '700',
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyIconText: {
    color: colors.primary,
    fontSize: 25,
    fontWeight: '600',
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyDescription: {
    color: colors.secondary,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 8,
  },
  emptyAction: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 11,
    marginTop: 18,
  },
  emptyActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  disclaimer: {
    color: colors.secondary,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 22,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(18, 28, 22, 0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 22,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 22,
  },
  modalTitleContainer: {
    flex: 1,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  modalDescription: {
    color: colors.secondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: colors.secondary,
    fontSize: 23,
    lineHeight: 25,
  },
  fieldLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: colors.input,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 14,
    marginBottom: 18,
  },
  formError: {
    color: colors.danger,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 14,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 9,
    marginTop: 8,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 11,
    paddingHorizontal: 14,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 11,
    paddingHorizontal: 16,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.6,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 24,
  },
  confirmIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  confirmIconText: {
    color: colors.danger,
    fontSize: 24,
    fontWeight: '700',
  },
  confirmTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '700',
    textAlign: 'center',
  },
  confirmDescription: {
    color: colors.secondary,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 10,
  },
  dangerConfirmButton: {
    backgroundColor: colors.danger,
    borderRadius: 11,
    paddingHorizontal: 16,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerConfirmButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});

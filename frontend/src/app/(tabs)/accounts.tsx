import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
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
  createAccount as createAccountRequest,
  deactivateAccount as deactivateAccountRequest,
  getAccounts,
  reactivateAccount as reactivateAccountRequest,
  updateAccount as updateAccountRequest,
  type Account,
  type AccountType,
} from '@/services/accounts-api';

type AccountFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

type AccountForm = {
  name: string;
  type: AccountType;
  openingBalance: string;
};

const colors = {
  background: '#F7F8F5',
  surface: '#FFFFFF',
  primary: '#176B52',
  primaryLight: '#E8F3ED',
  text: '#202923',
  secondary: '#788078',
  border: '#E9ECE7',
  income: '#27845B',
  danger: '#B84D4D',
  dangerLight: '#F9EDEC',
  input: '#FAFBF9',
};

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function formatAccountType(type: AccountType) {
  return type === 'CHECKING' ? 'Conta corrente' : 'Poupança';
}

function parseAmount(value: string): number | null {
  const normalized = value.trim().replace(/\s/g, '');

  if (!normalized) {
    return null;
  }

  let standardized: string;

  if (normalized.includes(',')) {
    standardized = normalized.replace(/\./g, '').replace(',', '.');
  } else {
    standardized = normalized;
  }

  if (!/^\d+(\.\d{1,2})?$/.test(standardized)) {
    return null;
  }

  const amount = Number(standardized);

  if (!Number.isFinite(amount) || amount < 0) {
    return null;
  }

  return Math.round(amount * 100) / 100;
}

const emptyForm: AccountForm = {
  name: '',
  type: 'CHECKING',
  openingBalance: '',
};

export default function AccountsScreen() {
  const router = useRouter();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const mutationInProgressRef = useRef(false);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<AccountFilter>('ALL');

  const [formVisible, setFormVisible] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(
      null,
  );
  const [form, setForm] = useState<AccountForm>(emptyForm);
  const [formError, setFormError] = useState('');

  const [reactivatingAccountId, setReactivatingAccountId] = useState<
      string | null
  >(null);
  const [reactivating, setReactivating] = useState(false);

  const [deactivatingAccountId, setDeactivatingAccountId] = useState<
      string | null
  >(null);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setLoadError('');

    try {
      const data = await getAccounts();
      setAccounts(data);
    } catch (error) {
      setLoadError(
          error instanceof Error
              ? error.message
              : 'Não foi possível carregar as contas.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  const actionsDisabled =
      loading || saving || deactivating || reactivating;

  const activeAccounts = useMemo(
      () => accounts.filter((account) => account.status === 'ACTIVE'),
      [accounts],
  );

  const totalBalance = useMemo(
      () => activeAccounts.reduce((total, account) => total + account.balance, 0),
      [activeAccounts],
  );

  const filteredAccounts = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR');

    return accounts.filter((account) => {
      const matchesSearch = account.name
      .toLocaleLowerCase('pt-BR')
      .includes(normalizedSearch);

      const matchesFilter =
          filter === 'ALL' ||
          (filter === 'ACTIVE' && account.status === 'ACTIVE') ||
          (filter === 'INACTIVE' && account.status === 'INACTIVE');

      return matchesSearch && matchesFilter;
    });
  }, [accounts, filter, search]);

  const editingAccount = editingAccountId
      ? accounts.find((account) => account.id === editingAccountId)
      : undefined;

  const deactivatingAccount = deactivatingAccountId
      ? accounts.find((account) => account.id === deactivatingAccountId)
      : undefined;

  const reactivatingAccount = reactivatingAccountId
      ? accounts.find((account) => account.id === reactivatingAccountId)
      : undefined;

  function showError(title: string, message: string) {
    Alert.alert(title, message);
  }

  function openCreateForm() {
    setEditingAccountId(null);
    setForm(emptyForm);
    setFormError('');
    setFormVisible(true);
  }

  function openEditForm(account: Account) {
    if (account.status !== 'ACTIVE') {
      showError(
          'Conta inativa',
          'Não é possível editar uma conta inativa nesta versão.',
      );
      return;
    }

    setEditingAccountId(account.id);
    setForm({
      name: account.name,
      type: account.type,
      openingBalance: '',
    });
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

  async function saveAccount() {
    if (mutationInProgressRef.current) {
      return;
    }

    const name = form.name.trim();

    if (!name) {
      setFormError('Informe o nome da conta.');
      return;
    }

    let openingBalance: number | null = null;

    if (!editingAccountId) {
      openingBalance =
          form.openingBalance.trim() === ''
              ? 0
              : parseAmount(form.openingBalance);

      if (openingBalance === null) {
        setFormError(
            'Informe um saldo inicial válido, usando no máximo duas casas decimais.',
        );
        return;
      }
    }

    mutationInProgressRef.current = true;
    setSaving(true);
    setFormError('');

    try {
      if (editingAccountId) {
        await updateAccountRequest(editingAccountId, {
          name,
          type: form.type,
        });
      } else {
        await createAccountRequest({
          name,
          type: form.type,
          openingBalance: openingBalance!,
          currency: 'BRL',
        });
      }

      setFormVisible(false);
      setForm(emptyForm);
      setEditingAccountId(null);
      setSearch('');
      setFilter('ALL');

      await loadAccounts();
    } catch (error) {
      setFormError(
          error instanceof Error
              ? error.message
              : 'Não foi possível salvar a conta.',
      );
    } finally {
      mutationInProgressRef.current = false;
      setSaving(false);
    }
  }

  async function confirmDeactivation() {
    if (!deactivatingAccountId || mutationInProgressRef.current) {
      return;
    }

    const accountId = deactivatingAccountId;

    mutationInProgressRef.current = true;
    setDeactivating(true);

    try {
      await deactivateAccountRequest(accountId);

      // Fecha o modal apenas se ele ainda estiver aberto para esta conta.
      setDeactivatingAccountId((currentId) =>
          currentId === accountId ? null : currentId,
      );

      await loadAccounts();
    } catch (error) {
      showError(
          'Não foi possível desativar a conta',
          error instanceof Error
              ? error.message
              : 'Ocorreu um erro. Tente novamente.',
      );
    } finally {
      mutationInProgressRef.current = false;
      setDeactivating(false);
    }
  }

  async function confirmReactivation() {
    if (!reactivatingAccountId || mutationInProgressRef.current) {
      return;
    }

    const accountId = reactivatingAccountId;

    mutationInProgressRef.current = true;
    setReactivating(true);

    try {
      await reactivateAccountRequest(accountId);
      setReactivatingAccountId(null);

      await loadAccounts();

      Alert.alert('Conta reativada', 'A conta foi reativada com sucesso.');
    } catch (error) {
      showError(
          'Não foi possível reativar a conta',
          error instanceof Error
              ? error.message
              : 'Ocorreu um erro. Tente novamente.',
      );
    } finally {
      mutationInProgressRef.current = false;
      setReactivating(false);
    }
  }

  function closeReactivationModal() {
    if (reactivating) {
      return;
    }

    setReactivatingAccountId(null);
  }

  function openAccountDetails(account: Account) {
    router.push({
      pathname: '/accounts/[id]',
      params: { id: account.id },
    });
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
              <Text style={styles.title}>Contas</Text>
              <Text style={styles.description}>
                Organize suas contas e acompanhe os saldos individuais.
              </Text>
            </View>

            <Pressable
                accessibilityRole="button"
                accessibilityLabel="Adicionar conta"
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

          <View style={styles.balanceCard}>
            <View style={styles.balanceHeader}>
              <View style={styles.balanceIcon}>
                <Text style={styles.balanceIconText}>▤</Text>
              </View>
              <Text style={styles.balanceLabel}>Saldo das contas ativas</Text>
            </View>

            <Text
                style={styles.balanceAmount}
                numberOfLines={1}
                adjustsFontSizeToFit
            >
              {formatCurrency(totalBalance)}
            </Text>

            <View style={styles.balanceFooter}>
              <View style={styles.activeDot} />
              <Text style={styles.balanceFooterText}>
                {activeAccounts.length}{' '}
                {activeAccounts.length === 1 ? 'conta ativa' : 'contas ativas'}
              </Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Suas contas</Text>
            <Text style={styles.sectionCaption}>
              {filteredAccounts.length}{' '}
              {filteredAccounts.length === 1 ? 'resultado' : 'resultados'}
            </Text>
          </View>

          <TextInput
              accessibilityLabel="Buscar contas"
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Buscar pelo nome da conta"
              placeholderTextColor={colors.secondary}
              returnKeyType="search"
              autoCapitalize="none"
          />

          <View style={styles.filterRow}>
            {(
                [
                  ['ALL', 'Todas'],
                  ['ACTIVE', 'Ativas'],
                  ['INACTIVE', 'Inativas'],
                ] as const
            ).map(([value, label]) => {
              const selected = filter === value;

              return (
                  <Pressable
                      key={value}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      style={[
                        styles.filterButton,
                        selected && styles.filterButtonSelected,
                      ]}
                      onPress={() => setFilter(value)}
                  >
                    <Text
                        style={[
                          styles.filterButtonText,
                          selected && styles.filterButtonTextSelected,
                        ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
              );
            })}
          </View>

          {loading ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>Carregando contas...</Text>
              </View>
          ) : loadError ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>
                  Não foi possível carregar as contas
                </Text>
                <Text style={styles.emptyDescription}>{loadError}</Text>
                <Pressable
                    accessibilityRole="button"
                    style={[
                      styles.emptyAction,
                      loading && styles.disabledButton,
                    ]}
                    onPress={() => void loadAccounts()}
                    disabled={loading}
                >
                  <Text style={styles.emptyActionText}>Tentar novamente</Text>
                </Pressable>
              </View>
          ) : filteredAccounts.length > 0 ? (
              <View style={styles.accountsList}>
                {filteredAccounts.map((account, index) => {
                  const isActive = account.status === 'ACTIVE';

                  return (
                      <View
                          key={account.id}
                          style={[
                            styles.accountCard,
                            !isActive && styles.accountCardInactive,
                            index !== filteredAccounts.length - 1 &&
                            styles.accountCardSpacing,
                          ]}
                      >
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Ver detalhes da conta ${account.name}`}
                            style={({ pressed }) => [
                              styles.accountHeader,
                              pressed && styles.headerPressed,
                            ]}
                            onPress={() => openAccountDetails(account)}
                        >
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

                          <View style={styles.accountDetails}>
                            <Text style={styles.accountName} numberOfLines={2}>
                              {account.name}
                            </Text>
                            <Text style={styles.accountType}>
                              {formatAccountType(account.type)}
                            </Text>
                          </View>

                          <View
                              style={[
                                styles.statusBadge,
                                isActive
                                    ? styles.statusBadgeActive
                                    : styles.statusBadgeInactive,
                              ]}
                          >
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
                        </Pressable>

                        <View style={styles.accountDivider} />

                        <View style={styles.accountFooter}>
                          <View style={styles.accountBalanceContainer}>
                            <Text style={styles.accountBalanceLabel}>
                              Saldo atual
                            </Text>
                            <Text
                                style={[
                                  styles.accountBalance,
                                  !isActive && styles.inactiveText,
                                ]}
                                numberOfLines={1}
                                adjustsFontSizeToFit
                            >
                              {formatCurrency(account.balance)}
                            </Text>
                          </View>

                          <View style={styles.accountActions}>
                            {isActive ? (
                                <>
                                  <Pressable
                                      accessibilityRole="button"
                                      accessibilityLabel={`Editar ${account.name}`}
                                      style={[
                                        styles.secondaryButton,
                                        actionsDisabled && styles.disabledButton,
                                      ]}
                                      onPress={() => openEditForm(account)}
                                      disabled={actionsDisabled}
                                  >
                                    <Text style={styles.secondaryButtonText}>
                                      Editar
                                    </Text>
                                  </Pressable>

                                  <Pressable
                                      accessibilityRole="button"
                                      accessibilityLabel={`Desativar ${account.name}`}
                                      style={[
                                        styles.deactivateButton,
                                        actionsDisabled && styles.disabledButton,
                                      ]}
                                      onPress={() =>
                                          setDeactivatingAccountId(account.id)
                                      }
                                      disabled={actionsDisabled}
                                  >
                                    <Text style={styles.deactivateButtonText}>
                                      Desativar
                                    </Text>
                                  </Pressable>
                                </>
                            ) : (
                                <Pressable
                                    accessibilityRole="button"
                                    accessibilityLabel={`Reativar ${account.name}`}
                                    style={[
                                      styles.secondaryButton,
                                      actionsDisabled && styles.disabledButton,
                                    ]}
                                    onPress={() =>
                                        setReactivatingAccountId(account.id)
                                    }
                                    disabled={actionsDisabled}
                                >
                                  <Text style={styles.secondaryButtonText}>
                                    Reativar
                                  </Text>
                                </Pressable>
                            )}
                          </View>
                        </View>
                      </View>
                  );
                })}
              </View>
          ) : (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIcon}>
                  <Text style={styles.emptyIconText}>⌕</Text>
                </View>

                <Text style={styles.emptyTitle}>
                  {search.trim()
                      ? 'Nenhuma conta encontrada'
                      : filter === 'ACTIVE'
                          ? 'Nenhuma conta ativa'
                          : filter === 'INACTIVE'
                              ? 'Nenhuma conta inativa'
                              : 'Nenhuma conta cadastrada'}
                </Text>

                <Text style={styles.emptyDescription}>
                  {search.trim()
                      ? 'Tente buscar por outro nome.'
                      : 'Adicione uma conta para começar a organizar seus saldos.'}
                </Text>

                {!search.trim() && filter !== 'INACTIVE' && (
                    <Pressable
                        accessibilityRole="button"
                        style={styles.emptyAction}
                        onPress={openCreateForm}
                    >
                      <Text style={styles.emptyActionText}>Adicionar conta</Text>
                    </Pressable>
                )}
              </View>
          )}

          <Text style={styles.disclaimer}>
            As contas são carregadas do backend do Ledger.
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
                    {editingAccountId ? 'Editar conta' : 'Nova conta'}
                  </Text>
                  <Text style={styles.modalDescription}>
                    {editingAccountId
                        ? 'Atualize os dados da sua conta.'
                        : 'Preencha os dados para cadastrar uma conta.'}
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

              <Text style={styles.fieldLabel}>Nome da conta</Text>
              <TextInput
                  accessibilityLabel="Nome da conta"
                  style={styles.textInput}
                  value={form.name}
                  onChangeText={(name) => {
                    setForm((current) => ({ ...current, name }));
                    setFormError('');
                  }}
                  placeholder="Ex.: Conta principal"
                  placeholderTextColor={colors.secondary}
                  autoCapitalize="sentences"
                  maxLength={80}
                  returnKeyType="next"
              />

              <Text style={styles.fieldLabel}>Tipo de conta</Text>
              <View style={styles.typeOptions}>
                {(
                    [
                      ['CHECKING', 'Conta corrente'],
                      ['SAVINGS', 'Poupança'],
                    ] as const
                ).map(([type, label]) => {
                  const selected = form.type === type;

                  return (
                      <Pressable
                          key={type}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          style={[
                            styles.typeOption,
                            selected && styles.typeOptionSelected,
                          ]}
                          onPress={() =>
                              setForm((current) => ({ ...current, type }))
                          }
                      >
                        <Text
                            style={[
                              styles.typeOptionText,
                              selected && styles.typeOptionTextSelected,
                            ]}
                        >
                          {label}
                        </Text>
                      </Pressable>
                  );
                })}
              </View>

              {!editingAccountId && (
                  <>
                    <Text style={styles.fieldLabel}>Saldo inicial (R$)</Text>
                    <TextInput
                        accessibilityLabel="Saldo inicial em reais"
                        style={styles.textInput}
                        value={form.openingBalance}
                        onChangeText={(openingBalance) => {
                          setForm((current) => ({
                            ...current,
                            openingBalance,
                          }));
                          setFormError('');
                        }}
                        placeholder="0,00"
                        placeholderTextColor={colors.secondary}
                        keyboardType="decimal-pad"
                        returnKeyType="done"
                    />
                    <Text style={styles.fieldHint}>
                      Informe um valor igual ou maior que zero.
                    </Text>
                  </>
              )}

              {formError ? (
                  <Text accessibilityRole="alert" style={styles.formError}>
                    {formError}
                  </Text>
              ) : null}

              <View style={styles.modalActions}>
                <Pressable
                    accessibilityRole="button"
                    style={styles.cancelButton}
                    onPress={closeForm}
                    disabled={saving}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </Pressable>

                <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ disabled: saving, busy: saving }}
                    style={[styles.saveButton, saving && styles.disabledButton]}
                    onPress={() => void saveAccount()}
                    disabled={saving}
                >
                  <Text style={styles.saveButtonText}>
                    {saving
                        ? 'Salvando...'
                        : editingAccountId
                            ? 'Salvar alterações'
                            : 'Criar conta'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        <Modal
            visible={Boolean(deactivatingAccount)}
            transparent
            animationType="fade"
            onRequestClose={() => setDeactivatingAccountId(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.confirmCard}>
              <View style={styles.confirmIcon}>
                <Text style={styles.confirmIconText}>!</Text>
              </View>

              <Text style={styles.confirmTitle}>Desativar conta?</Text>

              <Text style={styles.confirmDescription}>
                {deactivatingAccount
                    ? `A conta "${deactivatingAccount.name}" deixará de aparecer entre as contas ativas. Você poderá reativá-la posteriormente.`
                    : ''}
              </Text>

              <View style={styles.modalActions}>
                <Pressable
                    accessibilityRole="button"
                    style={styles.cancelButton}
                    onPress={() => setDeactivatingAccountId(null)}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </Pressable>

                <Pressable
                    accessibilityRole="button"
                    accessibilityState={{
                      disabled: deactivating,
                      busy: deactivating,
                    }}
                    style={[
                      styles.dangerConfirmButton,
                      deactivating && styles.disabledButton,
                    ]}
                    onPress={() => void confirmDeactivation()}
                    disabled={deactivating}
                >
                  <Text style={styles.dangerConfirmButtonText}>
                    {deactivating ? 'Desativando...' : 'Desativar'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
            visible={Boolean(reactivatingAccount)}
            transparent
            animationType="fade"
            onRequestClose={closeReactivationModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.confirmCard}>
              <View style={styles.confirmIcon}>
                <Text style={styles.reactivationIconText}>↻</Text>
              </View>

              <Text style={styles.confirmTitle}>Reativar conta?</Text>

              <Text style={styles.confirmDescription}>
                {reactivatingAccount
                    ? `Deseja reativar "${reactivatingAccount.name}"? A conta voltará a aparecer entre as contas ativas.`
                    : ''}
              </Text>

              <View style={styles.modalActions}>
                <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ disabled: reactivating }}
                    style={[
                      styles.cancelButton,
                      reactivating && styles.disabledButton,
                    ]}
                    onPress={closeReactivationModal}
                    disabled={reactivating}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </Pressable>

                <Pressable
                    accessibilityRole="button"
                    accessibilityState={{
                      disabled: reactivating,
                      busy: reactivating,
                    }}
                    style={[
                      styles.saveButton,
                      reactivating && styles.disabledButton,
                    ]}
                    onPress={() => void confirmReactivation()}
                    disabled={reactivating}
                >
                  <Text style={styles.saveButtonText}>
                    {reactivating ? 'Reativando...' : 'Reativar'}
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
  headerPressed: {
    opacity: 0.7,
  },
  balanceCard: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingHorizontal: 22,
    paddingVertical: 22,
    marginBottom: 30,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  balanceIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceIconText: {
    color: '#FFFFFF',
    fontSize: 20,
  },
  balanceLabel: {
    color: '#E0EEE7',
    fontSize: 13,
    fontWeight: '500',
  },
  balanceAmount: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.8,
    marginTop: 17,
  },
  balanceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 13,
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#9BD4B4',
  },
  balanceFooterText: {
    color: '#E0EEE7',
    fontSize: 12,
    fontWeight: '500',
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
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 13,
    marginBottom: 18,
  },
  filterButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: colors.surface,
  },
  filterButtonSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  filterButtonText: {
    color: colors.secondary,
    fontSize: 12,
    fontWeight: '600',
  },
  filterButtonTextSelected: {
    color: colors.primary,
  },
  accountsList: {
    gap: 12,
  },
  accountCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 17,
  },
  accountCardInactive: {
    backgroundColor: '#FAFAF8',
  },
  accountCardSpacing: {
    marginBottom: 0,
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  accountIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountIconInactive: {
    backgroundColor: '#EEEEEA',
  },
  accountIconText: {
    color: colors.primary,
    fontSize: 21,
  },
  accountDetails: {
    flex: 1,
  },
  accountName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  accountType: {
    color: colors.secondary,
    fontSize: 12,
    marginTop: 4,
  },
  statusBadge: {
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  statusBadgeActive: {
    backgroundColor: colors.primaryLight,
  },
  statusBadgeInactive: {
    backgroundColor: '#EEEEEA',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusTextActive: {
    color: colors.primary,
  },
  statusTextInactive: {
    color: colors.secondary,
  },
  accountDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 16,
  },
  accountFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  accountBalanceContainer: {
    flex: 1,
  },
  accountBalanceLabel: {
    color: colors.secondary,
    fontSize: 11,
    marginBottom: 5,
  },
  accountBalance: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  inactiveText: {
    color: colors.secondary,
  },
  accountActions: {
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
  deactivateButton: {
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 8,
    backgroundColor: colors.dangerLight,
  },
  deactivateButtonText: {
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
  typeOptions: {
    flexDirection: 'row',
    gap: 9,
    marginBottom: 20,
  },
  typeOption: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    backgroundColor: colors.input,
  },
  typeOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  typeOptionText: {
    color: colors.secondary,
    fontSize: 12,
    fontWeight: '600',
  },
  typeOptionTextSelected: {
    color: colors.primary,
  },
  fieldHint: {
    color: colors.secondary,
    fontSize: 11,
    marginTop: -10,
    marginBottom: 16,
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
  reactivationIconText: {
    color: colors.primary,
    fontSize: 25,
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
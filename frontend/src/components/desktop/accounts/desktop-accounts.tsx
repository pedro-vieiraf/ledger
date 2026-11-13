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
import { useFocusEffect, useRouter } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { DesktopAccountFormModal } from '@/components/desktop/accounts/desktop-account-form-modal';
import { formatCurrency } from '@/components/desktop/desktop-format';
import {
  desktopColors,
  desktopFont,
  desktopLayout,
  desktopShadows,
} from '@/components/desktop/desktop-theme';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { InlineFeedback } from '@/components/feedback/inline-feedback';
import { useAccounts } from '@/contexts/accounts-context';
import { useFeedback } from '@/contexts/feedback-context';
import { usePrivacy } from '@/contexts/privacy-context';
import {
  deactivateAccount as deactivateAccountRequest,
  deleteAccount as deleteAccountRequest,
  reactivateAccount as reactivateAccountRequest,
  type Account,
  type AccountType,
} from '@/services/accounts-api';
import { formatAccountType } from '@/utils/accounts';
import {
  getActiveAccounts,
  sumAccountBalances,
} from '@/utils/financial-summary';
import { maskMoney } from '@/utils/privacy';

/** Ícones da página, na mesma biblioteca usada pelo Dashboard. */
const ICONS = {
  add: { ios: 'plus', android: 'add', web: 'add' },
  more: { ios: 'ellipsis', android: 'more_horiz', web: 'more_horiz' },
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
  remove: { ios: 'trash', android: 'delete_outline', web: 'delete_outline' },
  close: { ios: 'xmark', android: 'close', web: 'close' },
  wallet: {
    ios: 'wallet.pass',
    android: 'account_balance_wallet',
    web: 'account_balance_wallet',
  },
  checking: {
    ios: 'building.columns',
    android: 'account_balance',
    web: 'account_balance',
  },
  savings: { ios: 'banknote', android: 'savings', web: 'savings' },
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

function getTypeIcon(type: AccountType): IconKey {
  return type === 'SAVINGS' ? 'savings' : 'checking';
}

const MENU_WIDTH = 188;
const MENU_HEIGHT = 132;

type MenuAnchor = {
  account: Account;
  left: number;
  top: number;
};

export function DesktopAccounts() {
  const router = useRouter();
  const { hidden } = usePrivacy();
  const { showToast } = useFeedback();
  const { accounts, loading, error: loadError, refreshAccounts } = useAccounts();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const [deactivating, setDeactivating] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const mutationInProgressRef = useRef(false);

  const [formTarget, setFormTarget] = useState<
    { mode: 'create' } | { mode: 'edit'; account: Account } | null
  >(null);

  const [menuAnchor, setMenuAnchor] = useState<MenuAnchor | null>(null);

  const [deactivatingAccountId, setDeactivatingAccountId] = useState<
    string | null
  >(null);
  const [deactivationError, setDeactivationError] = useState('');

  const [reactivatingAccountId, setReactivatingAccountId] = useState<
    string | null
  >(null);
  const [reactivationError, setReactivationError] = useState('');

  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(
    null,
  );
  const [deletionError, setDeletionError] = useState('');

  useFocusEffect(
    useCallback(() => {
      // Mantém os saldos atualizados com o backend, como na versão mobile.
      void refreshAccounts().catch(() => {
        // O erro já fica disponível no estado do contexto.
      });

      const intervalId = setInterval(() => {
        void refreshAccounts({ silent: true }).catch(() => {
          // O erro já fica disponível no estado do contexto.
        });
      }, 10_000);

      return () => clearInterval(intervalId);
    }, [refreshAccounts]),
  );

  const activeAccounts = useMemo(
    () => getActiveAccounts(accounts),
    [accounts],
  );

  const inactiveAccounts = useMemo(
    () => accounts.filter((account) => account.status === 'INACTIVE'),
    [accounts],
  );

  const totalBalance = useMemo(
    () => sumAccountBalances(activeAccounts),
    [activeAccounts],
  );

  // Contas ativas primeiro; inativas seguem visíveis, apenas em destaque menor.
  const orderedAccounts = useMemo(
    () => [...activeAccounts, ...inactiveAccounts],
    [activeAccounts, inactiveAccounts],
  );

  const actionsDisabled =
    loading || deactivating || reactivating || deleting;

  const deactivatingAccount = deactivatingAccountId
    ? accounts.find((account) => account.id === deactivatingAccountId)
    : undefined;

  const reactivatingAccount = reactivatingAccountId
    ? accounts.find((account) => account.id === reactivatingAccountId)
    : undefined;

  const deletingAccount = deletingAccountId
    ? accounts.find((account) => account.id === deletingAccountId)
    : undefined;

  function openCreateForm() {
    if (actionsDisabled || mutationInProgressRef.current) {
      return;
    }

    setFormTarget({ mode: 'create' });
  }

  function openEditForm(account: Account) {
    if (account.status !== 'ACTIVE') {
      showToast({
        variant: 'warning',
        title: 'Conta inativa',
        message: 'Não é possível editar uma conta inativa nesta versão.',
      });
      return;
    }

    if (actionsDisabled || mutationInProgressRef.current) {
      return;
    }

    setFormTarget({ mode: 'edit', account });
  }

  function openAccountDetails(account: Account) {
    router.push({
      pathname: '/accounts/[id]',
      params: { id: account.id },
    });
  }

  function openRowMenu(event: GestureResponderEvent, account: Account) {
    if (actionsDisabled || mutationInProgressRef.current) {
      return;
    }

    const { pageX, pageY } = event.nativeEvent;

    setMenuAnchor({
      account,
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

  function openDeactivationModal(account: Account) {
    if (actionsDisabled || mutationInProgressRef.current) {
      return;
    }

    setDeactivationError('');
    setDeactivatingAccountId(account.id);
  }

  async function confirmDeactivation() {
    if (!deactivatingAccountId || mutationInProgressRef.current) {
      return;
    }

    const accountId = deactivatingAccountId;

    mutationInProgressRef.current = true;
    setDeactivating(true);
    setDeactivationError('');

    try {
      await deactivateAccountRequest(accountId);

      setDeactivatingAccountId((currentId) =>
        currentId === accountId ? null : currentId,
      );

      await refreshAccounts();

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
      mutationInProgressRef.current = false;
      setDeactivating(false);
    }
  }

  function closeDeactivationModal() {
    if (deactivating) {
      return;
    }

    setDeactivatingAccountId(null);
    setDeactivationError('');
  }

  function openReactivationModal(account: Account) {
    if (actionsDisabled || mutationInProgressRef.current) {
      return;
    }

    setReactivationError('');
    setReactivatingAccountId(account.id);
  }

  async function confirmReactivation() {
    if (!reactivatingAccountId || mutationInProgressRef.current) {
      return;
    }

    const accountId = reactivatingAccountId;

    mutationInProgressRef.current = true;
    setReactivating(true);
    setReactivationError('');

    try {
      await reactivateAccountRequest(accountId);
      setReactivatingAccountId(null);

      await refreshAccounts();

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
      mutationInProgressRef.current = false;
      setReactivating(false);
    }
  }

  function closeReactivationModal() {
    if (reactivating) {
      return;
    }

    setReactivatingAccountId(null);
    setReactivationError('');
  }

  function openDeletionModal(account: Account) {
    if (actionsDisabled || mutationInProgressRef.current) {
      return;
    }

    setDeletionError('');
    setDeletingAccountId(account.id);
  }

  async function confirmDeletion() {
    if (!deletingAccountId || mutationInProgressRef.current) {
      return;
    }

    const accountId = deletingAccountId;

    mutationInProgressRef.current = true;
    setDeleting(true);
    setDeletionError('');

    try {
      await deleteAccountRequest(accountId);
      setDeletingAccountId(null);

      await refreshAccounts();

      showToast({
        variant: 'success',
        title: 'Conta excluída',
        message: 'As transações continuam no histórico.',
      });
    } catch (cause) {
      setDeletionError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível excluir a conta. Tente novamente.',
      );
    } finally {
      mutationInProgressRef.current = false;
      setDeleting(false);
    }
  }

  function closeDeletionModal() {
    if (deleting) {
      return;
    }

    setDeletingAccountId(null);
    setDeletionError('');
  }

  const emptyState = (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Icon name="wallet" size={26} color={desktopColors.primary} />
      </View>
      <Text style={styles.emptyTitle}>Nenhuma conta cadastrada</Text>
      <Text style={styles.emptyText}>
        Adicione uma conta para começar a organizar seus saldos.
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
        <Text style={styles.emptyButtonText}>Nova conta</Text>
      </Pressable>
    </View>
  );

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.pageHeader}>
        <View style={styles.heading}>
          <Text style={styles.title}>Minhas contas</Text>
          <Text style={styles.subtitle}>
            Acompanhe o saldo e a situação de cada conta.
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Nova conta"
          disabled={actionsDisabled}
          onPress={openCreateForm}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.primaryButtonPressed,
            actionsDisabled && styles.buttonDisabled,
          ]}
        >
          <Icon name="add" size={16} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>Nova conta</Text>
        </Pressable>
      </View>

      <View style={styles.balanceCard}>
        <View style={styles.balanceMain}>
          <View style={styles.balanceIcon}>
            <Icon name="wallet" size={20} color={desktopColors.primary} />
          </View>

          <View style={styles.balanceTexts}>
            <Text style={styles.balanceLabel}>Saldo total</Text>
            <Text
              style={[
                styles.balanceValue,
                totalBalance < 0 && styles.negativeValue,
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {maskMoney(formatCurrency(totalBalance), hidden)}
            </Text>
            <Text style={styles.balanceHint}>
              Somatório das contas ativas
            </Text>
          </View>
        </View>

        <View style={styles.balanceStats}>
          <View style={styles.balanceStat}>
            <Text style={styles.balanceStatValue}>{activeAccounts.length}</Text>
            <Text style={styles.balanceStatLabel}>
              {activeAccounts.length === 1 ? 'conta ativa' : 'contas ativas'}
            </Text>
          </View>

          <View style={styles.balanceStatDivider} />

          <View style={styles.balanceStat}>
            <Text style={styles.balanceStatValue}>
              {inactiveAccounts.length}
            </Text>
            <Text style={styles.balanceStatLabel}>
              {inactiveAccounts.length === 1 ? 'conta inativa' : 'contas inativas'}
            </Text>
          </View>
        </View>
      </View>

      {loadError ? (
        <InlineFeedback
          variant="error"
          title="Não foi possível atualizar as contas"
          message={loadError}
        />
      ) : null}

      {loading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={desktopColors.primary} />
          <Text style={styles.loadingText}>Carregando contas...</Text>
        </View>
      ) : (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Suas contas</Text>
            <Text style={styles.sectionHint}>
              {accounts.length}{' '}
              {accounts.length === 1 ? 'conta cadastrada' : 'contas cadastradas'}
            </Text>
          </View>

          {orderedAccounts.length > 0 ? (
            <View style={styles.grid}>
              {orderedAccounts.map((account) => {
                const isActive = account.status === 'ACTIVE';

                return (
                  <View
                    key={account.id}
                    style={[
                      styles.accountCard,
                      !isActive && styles.accountCardInactive,
                    ]}
                  >
                    <View style={styles.accountTop}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Ver detalhes da conta ${account.name}`}
                        onPress={() => openAccountDetails(account)}
                        style={({ pressed }) => [
                          styles.accountIdentityLink,
                          pressed && styles.accountIdentityLinkPressed,
                        ]}
                      >
                        <View
                          style={[
                            styles.accountIcon,
                            !isActive && styles.accountIconInactive,
                          ]}
                        >
                          <Icon
                            name={getTypeIcon(account.type)}
                            size={18}
                            color={
                              isActive
                                ? desktopColors.primary
                                : desktopColors.textMuted
                            }
                          />
                        </View>

                        <View style={styles.accountIdentity}>
                          <Text
                            style={[
                              styles.accountName,
                              !isActive && styles.accountNameInactive,
                            ]}
                            numberOfLines={1}
                          >
                            {account.name}
                          </Text>
                          <Text style={styles.accountMeta} numberOfLines={1}>
                            {formatAccountType(account.type)}
                          </Text>
                        </View>
                      </Pressable>

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

                    <View style={styles.accountDivider} />

                    <View style={styles.accountBottom}>
                      <View style={styles.balanceContainer}>
                        <Text style={styles.accountBalanceLabel}>
                          Saldo atual
                        </Text>
                        <Text
                          style={[
                            styles.accountBalance,
                            !isActive && styles.accountBalanceInactive,
                          ]}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                        >
                          {maskMoney(formatCurrency(account.balance), hidden)}
                        </Text>
                      </View>

                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Ações da conta ${account.name}`}
                        onPress={(event) => openRowMenu(event, account)}
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
              })}
            </View>
          ) : (
            emptyState
          )}
        </>
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
                { left: menuAnchor.left, top: menuAnchor.top },
              ]}
            >
              {menuAnchor.account.status === 'ACTIVE' ? (
                <>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      const { account } = menuAnchor;
                      setMenuAnchor(null);
                      openEditForm(account);
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
                      const { account } = menuAnchor;
                      setMenuAnchor(null);
                      openDeactivationModal(account);
                    }}
                    style={({ pressed }) => [
                      styles.rowMenuItem,
                      pressed && styles.rowMenuItemPressed,
                    ]}
                  >
                    <Icon
                      name="deactivate"
                      size={15}
                      color={desktopColors.warning}
                    />
                    <Text style={styles.rowMenuText}>Desativar</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      const { account } = menuAnchor;
                      setMenuAnchor(null);
                      openReactivationModal(account);
                    }}
                    style={({ pressed }) => [
                      styles.rowMenuItem,
                      pressed && styles.rowMenuItemPressed,
                    ]}
                  >
                    <Icon
                      name="reactivate"
                      size={15}
                      color={desktopColors.primary}
                    />
                    <Text style={styles.rowMenuText}>Reativar</Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      const { account } = menuAnchor;
                      setMenuAnchor(null);
                      openDeletionModal(account);
                    }}
                    style={({ pressed }) => [
                      styles.rowMenuItem,
                      pressed && styles.rowMenuItemPressed,
                    ]}
                  >
                    <Icon
                      name="remove"
                      size={15}
                      color={desktopColors.expense}
                    />
                    <Text
                      style={[styles.rowMenuText, styles.rowMenuDangerText]}
                    >
                      Excluir
                    </Text>
                  </Pressable>
                </>
              )}
            </View>
          ) : null}
        </View>
      </Modal>

      {formTarget ? (
        <DesktopAccountFormModal
          mode={formTarget.mode}
          account={formTarget.mode === 'edit' ? formTarget.account : null}
          onClose={() => setFormTarget(null)}
        />
      ) : null}

      <ConfirmDialog
        visible={Boolean(deactivatingAccount)}
        title="Desativar conta?"
        message={
          deactivatingAccount
            ? `A conta "${deactivatingAccount.name}" deixará de aparecer entre as contas ativas. Você poderá reativá-la posteriormente.`
            : ''
        }
        confirmLabel="Desativar"
        tone="warning"
        loading={deactivating}
        error={deactivationError}
        onConfirm={() => void confirmDeactivation()}
        onCancel={closeDeactivationModal}
      />

      <ConfirmDialog
        visible={Boolean(reactivatingAccount)}
        title="Reativar conta?"
        message={
          reactivatingAccount
            ? `Deseja reativar "${reactivatingAccount.name}"? A conta voltará a aparecer entre as contas ativas.`
            : ''
        }
        confirmLabel="Reativar"
        tone="primary"
        loading={reactivating}
        error={reactivationError}
        onConfirm={() => void confirmReactivation()}
        onCancel={closeReactivationModal}
      />

      <ConfirmDialog
        visible={Boolean(deletingAccount)}
        title="Excluir conta?"
        message={
          deletingAccount
            ? `Deseja excluir "${deletingAccount.name}"? A conta será removida da lista e não poderá ser reativada. As transações do histórico continuam disponíveis, mas aparecerão como "Conta excluída".`
            : ''
        }
        confirmLabel="Excluir"
        tone="danger"
        loading={deleting}
        error={deletionError}
        onConfirm={() => void confirmDeletion()}
        onCancel={closeDeletionModal}
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
  balanceCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 24,
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
    width: 46,
    height: 46,
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
  balanceStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    paddingHorizontal: 4,
  },
  balanceStat: {
    minWidth: 78,
  },
  balanceStatValue: {
    color: desktopColors.text,
    fontSize: 20,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    fontFamily: desktopFont,
  },
  balanceStatLabel: {
    marginTop: 2,
    color: desktopColors.textMuted,
    fontSize: 10,
    fontFamily: desktopFont,
  },
  balanceStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: desktopColors.border,
  },
  loadingCard: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 56,
    borderRadius: desktopLayout.radius,
    borderWidth: 1,
    borderColor: desktopColors.border,
    backgroundColor: desktopColors.surface,
    ...desktopShadows.card,
  },
  loadingText: {
    color: desktopColors.textSecondary,
    fontSize: 12,
    fontFamily: desktopFont,
  },
  sectionHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  accountCard: {
    flexGrow: 1,
    flexBasis: 300,
    maxWidth: 460,
    gap: 14,
    padding: 18,
    borderRadius: desktopLayout.radius,
    borderWidth: 1,
    borderColor: desktopColors.border,
    backgroundColor: desktopColors.surface,
    ...desktopShadows.card,
  },
  accountCardInactive: {
    backgroundColor: desktopColors.surfaceMuted,
    borderColor: desktopColors.borderStrong,
  },
  accountTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  accountIdentityLink: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 10,
  },
  accountIdentityLinkPressed: {
    opacity: 0.72,
  },
  accountIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: desktopColors.primarySoft,
  },
  accountIconInactive: {
    backgroundColor: desktopColors.surface,
  },
  accountIdentity: {
    flex: 1,
    minWidth: 0,
  },
  accountName: {
    color: desktopColors.text,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: desktopFont,
  },
  accountNameInactive: {
    color: desktopColors.textSecondary,
  },
  accountMeta: {
    marginTop: 3,
    color: desktopColors.textMuted,
    fontSize: 11,
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
    backgroundColor: desktopColors.surface,
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
  accountDivider: {
    height: 1,
    backgroundColor: desktopColors.border,
  },
  accountBottom: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 10,
  },
  balanceContainer: {
    flexShrink: 1,
    minWidth: 0,
  },
  accountBalanceLabel: {
    color: desktopColors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    fontFamily: desktopFont,
  },
  accountBalance: {
    marginTop: 4,
    color: desktopColors.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
    fontFamily: desktopFont,
  },
  accountBalanceInactive: {
    color: desktopColors.textSecondary,
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
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 52,
    borderRadius: desktopLayout.radius,
    borderWidth: 1,
    borderColor: desktopColors.border,
    backgroundColor: desktopColors.surface,
    ...desktopShadows.card,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    backgroundColor: desktopColors.primarySoft,
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

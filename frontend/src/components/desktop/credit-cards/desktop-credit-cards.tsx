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

import { CreditCardUsageBar } from '@/components/credit-cards/credit-card-usage-bar';
import { DesktopCreditCardFormModal } from '@/components/desktop/credit-cards/desktop-credit-card-form-modal';
import { formatCurrency } from '@/components/desktop/desktop-format';
import {
  desktopColors,
  desktopFont,
  desktopLayout,
  desktopShadows,
} from '@/components/desktop/desktop-theme';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { InlineFeedback } from '@/components/feedback/inline-feedback';
import { useCreditCards } from '@/contexts/credit-cards-context';
import { useFeedback } from '@/contexts/feedback-context';
import { usePrivacy } from '@/contexts/privacy-context';
import type { CreditCardInvoice } from '@/services/credit-card-invoices-api';
import {
  deactivateCreditCard as deactivateCreditCardRequest,
  reactivateCreditCard as reactivateCreditCardRequest,
  type CreditCard,
} from '@/services/credit-cards-api';
import { getCreditCardErrorMessage } from '@/utils/credit-card-errors';
import {
  CARD_STATUS_LABELS,
  INVOICE_STATUS_LABELS,
  findCurrentInvoice,
  findOutstandingInvoice,
  formatDateKey,
  getCommittedLimit,
  getUsageRatio,
  isInvoiceOverdue,
  summarizeLimits,
} from '@/utils/credit-cards';
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
  card: { ios: 'creditcard', android: 'credit_card', web: 'credit_card' },
  calendar: {
    ios: 'calendar',
    android: 'calendar_month',
    web: 'calendar_month',
  },
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

function getHighlightedInvoice(invoices: CreditCardInvoice[]) {
  return findCurrentInvoice(invoices) ?? findOutstandingInvoice(invoices);
}

function getInvoiceLabel(invoice: CreditCardInvoice) {
  return invoice.status === 'OPEN' ? 'Fatura atual' : 'Fatura pendente';
}

const MENU_WIDTH = 188;
const MENU_HEIGHT = 92;

type MenuAnchor = {
  card: CreditCard;
  left: number;
  top: number;
};

type FormTarget =
  | { mode: 'create' }
  | { mode: 'edit'; card: CreditCard };

export function DesktopCreditCards() {
  const router = useRouter();
  const { hidden } = usePrivacy();
  const { showToast } = useFeedback();
  const {
    cards,
    invoicesByCard,
    loading,
    error: loadError,
    invoicesError,
    refreshCreditCards,
  } = useCreditCards();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const [formTarget, setFormTarget] = useState<FormTarget | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<MenuAnchor | null>(null);
  const [deactivating, setDeactivating] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  const [deactivatingCardId, setDeactivatingCardId] = useState<
    string | null
  >(null);
  const [deactivationError, setDeactivationError] = useState('');
  const [reactivatingCardId, setReactivatingCardId] = useState<
    string | null
  >(null);
  const [reactivationError, setReactivationError] = useState('');
  const mutationInProgressRef = useRef(false);

  const actionsDisabled = loading || deactivating || reactivating;

  useFocusEffect(
    useCallback(() => {
      void refreshCreditCards({ silent: true }).catch(() => {
        // O erro já fica disponível no estado do contexto.
      });
    }, [refreshCreditCards]),
  );

  const activeCards = useMemo(
    () => cards.filter((card) => card.status === 'ACTIVE'),
    [cards],
  );

  const inactiveCards = useMemo(
    () => cards.filter((card) => card.status === 'INACTIVE'),
    [cards],
  );

  // Cartões ativos primeiro; os inativos continuam visíveis para consulta.
  const orderedCards = useMemo(
    () => [...activeCards, ...inactiveCards],
    [activeCards, inactiveCards],
  );

  const summary = useMemo(
    () => summarizeLimits(activeCards),
    [activeCards],
  );

  const deactivatingCard = deactivatingCardId
    ? cards.find((card) => card.id === deactivatingCardId)
    : undefined;

  const reactivatingCard = reactivatingCardId
    ? cards.find((card) => card.id === reactivatingCardId)
    : undefined;

  function openCreateForm() {
    if (actionsDisabled || mutationInProgressRef.current) {
      return;
    }

    setFormTarget({ mode: 'create' });
  }

  function openDetails(card: CreditCard) {
    router.push({
      pathname: '/credit-cards/[id]',
      params: { id: card.id },
    });
  }

  function openEditForm(card: CreditCard) {
    if (card.status !== 'ACTIVE') {
      showToast({
        variant: 'warning',
        title: 'Cartão inativo',
        message:
          'Reative o cartão antes de editar os dados cadastrais.',
      });
      return;
    }

    if (actionsDisabled || mutationInProgressRef.current) {
      return;
    }

    setFormTarget({ mode: 'edit', card });
  }

  function openRowMenu(event: GestureResponderEvent, card: CreditCard) {
    if (actionsDisabled || mutationInProgressRef.current) {
      return;
    }

    const { pageX, pageY } = event.nativeEvent;

    setMenuAnchor({
      card,
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

  function openDeactivationModal(card: CreditCard) {
    if (actionsDisabled || mutationInProgressRef.current) {
      return;
    }

    setDeactivationError('');
    setDeactivatingCardId(card.id);
  }

  async function confirmDeactivation() {
    if (!deactivatingCardId || mutationInProgressRef.current) {
      return;
    }

    const cardId = deactivatingCardId;

    mutationInProgressRef.current = true;
    setDeactivating(true);
    setDeactivationError('');

    try {
      await deactivateCreditCardRequest(cardId);

      setDeactivatingCardId((currentId) =>
        currentId === cardId ? null : currentId,
      );

      // O histórico e as faturas continuam disponíveis; apenas a listagem é
      // atualizada para refletir o novo status.
      await refreshCreditCards().catch(() => {
        // A mutação já foi confirmada pelo backend.
      });

      showToast({
        variant: 'success',
        title: 'Cartão desativado',
        message:
          'O histórico e as faturas continuam disponíveis para consulta.',
      });
    } catch (cause) {
      setDeactivationError(
        getCreditCardErrorMessage(cause, 'deactivate'),
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

    setDeactivatingCardId(null);
    setDeactivationError('');
  }

  function openReactivationModal(card: CreditCard) {
    if (actionsDisabled || mutationInProgressRef.current) {
      return;
    }

    setReactivationError('');
    setReactivatingCardId(card.id);
  }

  async function confirmReactivation() {
    if (!reactivatingCardId || mutationInProgressRef.current) {
      return;
    }

    const cardId = reactivatingCardId;

    mutationInProgressRef.current = true;
    setReactivating(true);
    setReactivationError('');

    try {
      await reactivateCreditCardRequest(cardId);
      setReactivatingCardId(null);

      await refreshCreditCards().catch(() => {
        // A mutação já foi confirmada pelo backend.
      });

      showToast({
        variant: 'success',
        title: 'Cartão reativado',
        message: 'O cartão voltou a aceitar novos lançamentos.',
      });
    } catch (cause) {
      setReactivationError(
        getCreditCardErrorMessage(cause, 'reactivate'),
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

    setReactivatingCardId(null);
    setReactivationError('');
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.pageHeader}>
        <View style={styles.heading}>
          <Text style={styles.title}>Cartões de crédito</Text>
          <Text style={styles.subtitle}>
            Acompanhe limites, faturas e o uso de cada cartão.
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Novo cartão"
          disabled={actionsDisabled}
          onPress={openCreateForm}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.primaryButtonPressed,
            actionsDisabled && styles.buttonDisabled,
          ]}
        >
          <Icon name="add" size={16} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>Novo cartão</Text>
        </Pressable>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryMain}>
          <View style={styles.summaryIcon}>
            <Icon name="card" size={22} color={desktopColors.primary} />
          </View>

          <View style={styles.summaryTexts}>
            <Text style={styles.summaryLabel}>Limite total</Text>
            <Text
              style={styles.summaryValue}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {maskMoney(formatCurrency(summary.totalLimit), hidden)}
            </Text>
            <Text style={styles.summaryHint}>
              {activeCards.length}{' '}
              {activeCards.length === 1
                ? 'cartão ativo'
                : 'cartões ativos'}
            </Text>
          </View>
        </View>

        <View style={styles.summaryStats}>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryStatLabel}>Comprometido</Text>
            <Text style={styles.summaryStatValue} numberOfLines={1}>
              {maskMoney(formatCurrency(summary.committedLimit), hidden)}
            </Text>
          </View>

          <View style={styles.summaryStatDivider} />

          <View style={styles.summaryStat}>
            <Text style={styles.summaryStatLabel}>Disponível</Text>
            <Text
              style={[
                styles.summaryStatValue,
                styles.summaryStatValueAvailable,
              ]}
              numberOfLines={1}
            >
              {maskMoney(formatCurrency(summary.availableLimit), hidden)}
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.summaryNote}>
        Indicadores consolidados são apenas informativos. O limite disponível
        de cada cartão é individual e vem do backend.
      </Text>

      {loadError ? (
        <InlineFeedback
          variant="error"
          title="Não foi possível atualizar os cartões"
          message={loadError}
        />
      ) : null}

      {invoicesError && !loadError ? (
        <InlineFeedback
          variant="warning"
          title="Faturas desatualizadas"
          message={`${invoicesError} Os dados dos cartões continuam disponíveis.`}
        />
      ) : null}

      {loading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={desktopColors.primary} />
          <Text style={styles.loadingText}>Carregando cartões...</Text>
        </View>
      ) : (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Seus cartões</Text>
            <Text style={styles.sectionHint}>
              {cards.length}{' '}
              {cards.length === 1 ? 'cartão cadastrado' : 'cartões cadastrados'}
            </Text>
          </View>

          {orderedCards.length > 0 ? (
            <View style={styles.grid}>
              {orderedCards.map((card) => (
                <CreditCardCard
                  key={card.id}
                  card={card}
                  invoices={invoicesByCard[card.id] ?? []}
                  invoicesUnavailable={Boolean(invoicesError)}
                  hidden={hidden}
                  actionsDisabled={actionsDisabled}
                  onOpenMenu={(event) => openRowMenu(event, card)}
                  onOpenDetails={() => openDetails(card)}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Icon name="empty" size={26} color={desktopColors.primary} />
              </View>
              <Text style={styles.emptyTitle}>Nenhum cartão cadastrado</Text>
              <Text style={styles.emptyText}>
                Cadastre um cartão de crédito para acompanhar limites,
                faturas e compras.
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
                <Text style={styles.emptyButtonText}>Novo cartão</Text>
              </Pressable>
            </View>
          )}
        </>
      )}

      <Text style={styles.disclaimer}>
        As compras no cartão não reduzem o saldo da conta; o saldo é reduzido
        apenas no pagamento da fatura.
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
              {menuAnchor.card.status === 'ACTIVE' ? (
                <>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      const { card } = menuAnchor;
                      setMenuAnchor(null);
                      openEditForm(card);
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
                      const { card } = menuAnchor;
                      setMenuAnchor(null);
                      openDeactivationModal(card);
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
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    const { card } = menuAnchor;
                    setMenuAnchor(null);
                    openReactivationModal(card);
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
              )}
            </View>
          ) : null}
        </View>
      </Modal>

      {formTarget ? (
        <DesktopCreditCardFormModal
          mode={formTarget.mode}
          card={formTarget.mode === 'edit' ? formTarget.card : null}
          onClose={() => setFormTarget(null)}
        />
      ) : null}

      <ConfirmDialog
        visible={Boolean(deactivatingCard)}
        title="Desativar cartão?"
        message={
          deactivatingCard
            ? `O cartão "${deactivatingCard.name}" deixará de aceitar novos lançamentos. O histórico e as faturas continuam disponíveis para consulta.`
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
        visible={Boolean(reactivatingCard)}
        title="Reativar cartão?"
        message={
          reactivatingCard
            ? `Deseja reativar "${reactivatingCard.name}"? O cartão voltará a aceitar novos lançamentos.`
            : ''
        }
        confirmLabel="Reativar"
        tone="primary"
        loading={reactivating}
        error={reactivationError}
        onConfirm={() => void confirmReactivation()}
        onCancel={closeReactivationModal}
      />
    </ScrollView>
  );
}

function CreditCardCard({
  card,
  invoices,
  invoicesUnavailable,
  hidden,
  actionsDisabled,
  onOpenMenu,
  onOpenDetails,
}: {
  card: CreditCard;
  invoices: CreditCardInvoice[];
  invoicesUnavailable: boolean;
  hidden: boolean;
  actionsDisabled: boolean;
  onOpenMenu: (event: GestureResponderEvent) => void;
  onOpenDetails: () => void;
}) {
  const isActive = card.status === 'ACTIVE';
  const invoice = getHighlightedInvoice(invoices);
  const overdue = invoice ? isInvoiceOverdue(invoice) : false;

  return (
    <View style={[styles.card, !isActive && styles.cardInactive]}>
      <View style={styles.cardTop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Ver detalhes do cartão ${card.name}`}
          onPress={onOpenDetails}
          style={({ pressed }) => [
            styles.cardIdentity,
            pressed && styles.cardIdentityPressed,
          ]}
        >
          <View
            style={[styles.cardIcon, !isActive && styles.cardIconInactive]}
          >
            <Icon
              name="card"
              size={18}
              color={
                isActive ? desktopColors.primary : desktopColors.textMuted
              }
            />
          </View>

          <View style={styles.cardIdentityTexts}>
            <Text style={styles.cardName} numberOfLines={1}>
              {card.name}
            </Text>
            <Text style={styles.cardIssuer} numberOfLines={1}>
              {card.issuer}
            </Text>
          </View>
        </Pressable>

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
            {CARD_STATUS_LABELS[card.status]}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Ações do cartão ${card.name}`}
          accessibilityState={{ disabled: actionsDisabled }}
          disabled={actionsDisabled}
          onPress={onOpenMenu}
          style={({ pressed }) => [
            styles.moreButton,
            pressed && styles.moreButtonPressed,
            actionsDisabled && styles.buttonDisabled,
          ]}
        >
          <Icon
            name="more"
            size={18}
            color={desktopColors.textSecondary}
          />
        </Pressable>
      </View>

      <View style={styles.divider} />

      <View style={styles.limitsRow}>
        <View style={styles.limitBlock}>
          <Text style={styles.limitLabel}>Disponível</Text>
          <Text
            style={[styles.limitValue, !isActive && styles.mutedValue]}
            numberOfLines={1}
          >
            {maskMoney(formatCurrency(card.availableLimit), hidden)}
          </Text>
        </View>

        <View style={styles.limitBlock}>
          <Text style={styles.limitLabel}>Comprometido</Text>
          <Text style={styles.limitValueMuted} numberOfLines={1}>
            {maskMoney(formatCurrency(getCommittedLimit(card)), hidden)}
          </Text>
        </View>
      </View>

      <View style={styles.usageBlock}>
        <View style={styles.usageHeader}>
          <Text style={styles.usageLabel}>Uso do limite</Text>
          <Text style={styles.usagePercentage}>
            {Math.round(getUsageRatio(card) * 100)}%
          </Text>
        </View>

        <CreditCardUsageBar ratio={getUsageRatio(card)} />

        <Text style={styles.usageHint}>
          Limite total de {maskMoney(formatCurrency(card.creditLimit), hidden)}
        </Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.scheduleRow}>
        <View style={styles.scheduleItem}>
          <Icon
            name="calendar"
            size={13}
            color={desktopColors.textMuted}
          />
          <Text style={styles.scheduleText}>Fecha dia {card.closingDay}</Text>
        </View>

        <View style={styles.scheduleItem}>
          <Icon
            name="calendar"
            size={13}
            color={desktopColors.textMuted}
          />
          <Text style={styles.scheduleText}>Vence dia {card.dueDay}</Text>
        </View>
      </View>

      {invoice ? (
        <View style={styles.invoiceBlock}>
          <View style={styles.invoiceTexts}>
            <Text style={styles.invoiceLabel}>
              {getInvoiceLabel(invoice)}
            </Text>
            <Text style={styles.invoiceValue} numberOfLines={1}>
              {maskMoney(formatCurrency(invoice.remainingAmount), hidden)}
            </Text>
            <Text style={styles.invoiceDue}>
              Vence em {formatDateKey(invoice.dueDate)}
            </Text>
          </View>

          {overdue ? (
            <View style={styles.overdueBadge}>
              <Text style={styles.overdueText}>Atrasada</Text>
            </View>
          ) : (
            <View style={styles.invoiceStatusBadge}>
              <Text style={styles.invoiceStatusText}>
                {INVOICE_STATUS_LABELS[invoice.status]}
              </Text>
            </View>
          )}
        </View>
      ) : (
        <Text style={styles.invoiceEmpty}>
          {invoicesUnavailable
            ? 'Faturas indisponíveis no momento.'
            : 'Sem fatura em aberto.'}
        </Text>
      )}
    </View>
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
    gap: 16,
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
  summaryCard: {
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
  summaryMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flexGrow: 1,
    minWidth: 250,
  },
  summaryIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: desktopColors.primarySoft,
  },
  summaryTexts: {
    flexShrink: 1,
    minWidth: 0,
  },
  summaryLabel: {
    color: desktopColors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontFamily: desktopFont,
  },
  summaryValue: {
    marginTop: 4,
    color: desktopColors.primary,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1.1,
    fontVariant: ['tabular-nums'],
    fontFamily: desktopFont,
  },
  summaryHint: {
    marginTop: 2,
    color: desktopColors.textSecondary,
    fontSize: 11,
    fontFamily: desktopFont,
  },
  summaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    paddingHorizontal: 4,
  },
  summaryStat: {
    minWidth: 110,
  },
  summaryStatLabel: {
    color: desktopColors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontFamily: desktopFont,
  },
  summaryStatValue: {
    marginTop: 4,
    color: desktopColors.text,
    fontSize: 17,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    fontFamily: desktopFont,
  },
  summaryStatValueAvailable: {
    color: desktopColors.income,
  },
  summaryStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: desktopColors.border,
  },
  summaryNote: {
    marginTop: -6,
    color: desktopColors.textMuted,
    fontSize: 11,
    lineHeight: 17,
    fontFamily: desktopFont,
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
  card: {
    flexGrow: 1,
    flexBasis: 320,
    maxWidth: 460,
    gap: 14,
    padding: 18,
    borderRadius: desktopLayout.radius,
    borderWidth: 1,
    borderColor: desktopColors.border,
    backgroundColor: desktopColors.surface,
    ...desktopShadows.card,
  },
  cardInactive: {
    backgroundColor: desktopColors.surfaceMuted,
    borderColor: desktopColors.borderStrong,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardIdentity: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardIdentityPressed: {
    opacity: 0.72,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: desktopColors.primarySoft,
  },
  cardIconInactive: {
    backgroundColor: desktopColors.surface,
  },
  cardIdentityTexts: {
    flex: 1,
    minWidth: 0,
  },
  cardName: {
    color: desktopColors.text,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: desktopFont,
  },
  cardIssuer: {
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
  divider: {
    height: 1,
    backgroundColor: desktopColors.border,
  },
  limitsRow: {
    flexDirection: 'row',
    gap: 24,
  },
  limitBlock: {
    flex: 1,
    minWidth: 0,
  },
  limitLabel: {
    color: desktopColors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    fontFamily: desktopFont,
  },
  limitValue: {
    marginTop: 4,
    color: desktopColors.text,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
    fontVariant: ['tabular-nums'],
    fontFamily: desktopFont,
  },
  limitValueMuted: {
    marginTop: 4,
    color: desktopColors.textSecondary,
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    fontFamily: desktopFont,
  },
  mutedValue: {
    color: desktopColors.textSecondary,
  },
  usageBlock: {
    gap: 7,
  },
  usageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  usageLabel: {
    color: desktopColors.textSecondary,
    fontSize: 11,
    fontFamily: desktopFont,
  },
  usagePercentage: {
    color: desktopColors.text,
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    fontFamily: desktopFont,
  },
  usageHint: {
    color: desktopColors.textMuted,
    fontSize: 10,
    fontFamily: desktopFont,
  },
  scheduleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scheduleText: {
    color: desktopColors.textSecondary,
    fontSize: 11,
    fontFamily: desktopFont,
  },
  invoiceBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 12,
    borderRadius: desktopLayout.radiusSmall,
    backgroundColor: desktopColors.surfaceMuted,
  },
  invoiceTexts: {
    flexShrink: 1,
    minWidth: 0,
  },
  invoiceLabel: {
    color: desktopColors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    fontFamily: desktopFont,
  },
  invoiceValue: {
    marginTop: 3,
    color: desktopColors.text,
    fontSize: 17,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    fontFamily: desktopFont,
  },
  invoiceDue: {
    marginTop: 2,
    color: desktopColors.textSecondary,
    fontSize: 10,
    fontFamily: desktopFont,
  },
  invoiceStatusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: desktopColors.surface,
  },
  invoiceStatusText: {
    color: desktopColors.textSecondary,
    fontSize: 9,
    fontWeight: '700',
    fontFamily: desktopFont,
  },
  overdueBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: desktopColors.expenseSoft,
  },
  overdueText: {
    color: desktopColors.expense,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    fontFamily: desktopFont,
  },
  invoiceEmpty: {
    color: desktopColors.textMuted,
    fontSize: 11,
    fontFamily: desktopFont,
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
    height: 38,
    flexDirection: 'row',
    gap: 6,
    marginTop: 18,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: desktopColors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: desktopColors.surface,
  },
  emptyButtonPressed: {
    backgroundColor: desktopColors.surfaceMuted,
  },
  emptyButtonText: {
    color: desktopColors.primary,
    fontSize: 12,
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
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: desktopColors.border,
    backgroundColor: desktopColors.surface,
    ...desktopShadows.card,
  },
  rowMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 8,
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
  disclaimer: {
    marginTop: 4,
    color: desktopColors.textMuted,
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    fontFamily: desktopFont,
  },
});

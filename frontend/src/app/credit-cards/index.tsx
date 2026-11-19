import { useCallback, useMemo, useRef, useState } from 'react';
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
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { MobileCreditCardFormModal } from '@/components/credit-cards/mobile-credit-card-form-modal';
import { CreditCardUsageBar } from '@/components/credit-cards/credit-card-usage-bar';
import { DesktopCreditCards } from '@/components/desktop/credit-cards/desktop-credit-cards';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { InlineFeedback } from '@/components/feedback/inline-feedback';
import {
  mobileColors,
  mobileFont,
  mobileRadius,
  mobileSpacing,
  mobileTypography,
} from '@/constants/mobile-theme';
import { useCreditCards } from '@/contexts/credit-cards-context';
import { useFeedback } from '@/contexts/feedback-context';
import { usePrivacy } from '@/contexts/privacy-context';
import { useIsDesktopLayout } from '@/hooks/use-is-desktop-layout';
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

const colors = {
  background: mobileColors.background,
  surface: mobileColors.surface,
  surfaceMuted: mobileColors.surfaceMuted,
  primary: mobileColors.primary,
  primaryLight: mobileColors.primarySoft,
  text: mobileColors.text,
  secondary: mobileColors.textSecondary,
  border: mobileColors.border,
  income: mobileColors.income,
  incomeLight: mobileColors.incomeSoft,
  danger: mobileColors.expense,
  dangerLight: mobileColors.expenseSoft,
};

const BACK_ICON = {
  ios: 'chevron.left',
  android: 'arrow_back',
  web: 'arrow_back',
} satisfies SymbolViewProps['name'];

const CARD_ICON = {
  ios: 'creditcard',
  android: 'credit_card',
  web: 'credit_card',
} satisfies SymbolViewProps['name'];

const ADD_ICON = {
  ios: 'plus',
  android: 'add',
  web: 'add',
} satisfies SymbolViewProps['name'];

type FormTarget =
  | { mode: 'create' }
  | { mode: 'edit'; card: CreditCard };

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function getHighlightedInvoice(invoices: CreditCardInvoice[]) {
  return findCurrentInvoice(invoices) ?? findOutstandingInvoice(invoices);
}

function getInvoiceLabel(invoice: CreditCardInvoice) {
  return invoice.status === 'OPEN' ? 'Fatura atual' : 'Fatura pendente';
}

export default function CreditCardsScreen() {
  const isDesktop = useIsDesktopLayout();

  if (isDesktop) {
    return <DesktopCreditCards />;
  }

  return <CreditCardsMobileScreen />;
}

function CreditCardsMobileScreen() {
  const router = useRouter();
  const { hidden } = usePrivacy();
  const {
    cards,
    invoicesByCard,
    loading,
    error: loadError,
    invoicesError,
    refreshCreditCards,
  } = useCreditCards();

  useFocusEffect(
    useCallback(() => {
      void refreshCreditCards({ silent: true }).catch(() => {
        // O erro já fica disponível no estado do contexto.
      });
    }, [refreshCreditCards]),
  );

  const { showToast } = useFeedback();
  const [formTarget, setFormTarget] = useState<FormTarget | null>(null);
  const [deactivatingCardId, setDeactivatingCardId] = useState<string | null>(
    null,
  );
  const [deactivating, setDeactivating] = useState(false);
  const [deactivationError, setDeactivationError] = useState('');
  const [reactivatingCardId, setReactivatingCardId] = useState<string | null>(
    null,
  );
  const [reactivating, setReactivating] = useState(false);
  const [reactivationError, setReactivationError] = useState('');
  const mutationInProgressRef = useRef(false);

  const actionsDisabled = loading || deactivating || reactivating;

  const activeCards = useMemo(
    () => cards.filter((card) => card.status === 'ACTIVE'),
    [cards],
  );

  const inactiveCards = useMemo(
    () => cards.filter((card) => card.status === 'INACTIVE'),
    [cards],
  );

  const orderedCards = useMemo(
    () => [...activeCards, ...inactiveCards],
    [activeCards, inactiveCards],
  );

  const summary = useMemo(
    () => summarizeLimits(activeCards),
    [activeCards],
  );

  function goBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/');
  }

  function openDetails(card: CreditCard) {
    router.push({
      pathname: '/credit-cards/[id]',
      params: { id: card.id },
    });
  }

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

  function openEditForm(card: CreditCard) {
    if (card.status !== 'ACTIVE') {
      showToast({
        variant: 'warning',
        title: 'Cartão inativo',
        message: 'Reative o cartão antes de editar os dados cadastrais.',
      });
      return;
    }

    if (actionsDisabled || mutationInProgressRef.current) {
      return;
    }

    setFormTarget({ mode: 'edit', card });
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
      setDeactivationError(getCreditCardErrorMessage(cause, 'deactivate'));
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
      setReactivationError(getCreditCardErrorMessage(cause, 'reactivate'));
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
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            onPress={goBack}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.pressed,
            ]}
          >
            <SymbolView
              name={BACK_ICON}
              size={20}
              tintColor={colors.primary}
            />
          </Pressable>

          <View style={styles.headerTexts}>
            <Text style={styles.eyebrow}>finora</Text>
            <Text style={styles.title}>Cartões</Text>
            <Text style={styles.subtitle}>
              Acompanhe limites e faturas dos seus cartões de crédito.
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View style={styles.summaryIcon}>
              <SymbolView
                name={CARD_ICON}
                size={20}
                tintColor="#FFFFFF"
              />
            </View>
            <Text style={styles.summaryLabel}>Limite total</Text>
          </View>

          <Text
            style={styles.summaryAmount}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {maskMoney(formatCurrency(summary.totalLimit), hidden)}
          </Text>

          <View style={styles.summaryStats}>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryStatLabel}>Comprometido</Text>
              <Text style={styles.summaryStatValue} numberOfLines={1}>
                {maskMoney(formatCurrency(summary.committedLimit), hidden)}
              </Text>
            </View>

            <View style={styles.summaryDivider} />

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

          <Text style={styles.summaryHint}>
            {activeCards.length}{' '}
            {activeCards.length === 1 ? 'cartão ativo' : 'cartões ativos'}.
            Indicadores apenas informativos.
          </Text>
        </View>

        <Text style={styles.summaryNote}>
          O limite disponível de cada cartão é individual e vem do backend.
        </Text>

        {loadError ? (
          <InlineFeedback
            variant="error"
            title="Não foi possível carregar os cartões"
            message={loadError}
            style={styles.feedback}
          />
        ) : null}

        {invoicesError && !loadError ? (
          <InlineFeedback
            variant="warning"
            title="Faturas desatualizadas"
            message={`${invoicesError} Os dados dos cartões continuam disponíveis.`}
            style={styles.feedback}
          />
        ) : null}

        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderTexts}>
            <Text style={styles.sectionTitle}>Seus cartões</Text>
            <Text style={styles.sectionCaption}>
              {orderedCards.length}{' '}
              {orderedCards.length === 1 ? 'cartão' : 'cartões'}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Novo cartão"
            accessibilityState={{ disabled: actionsDisabled }}
            disabled={actionsDisabled}
            onPress={openCreateForm}
            style={({ pressed }) => [
              styles.addButton,
              pressed && !actionsDisabled && styles.pressed,
              actionsDisabled && styles.disabledButton,
            ]}
          >
            <SymbolView name={ADD_ICON} size={14} tintColor="#FFFFFF" />
            <Text style={styles.addButtonText}>Novo cartão</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.stateTitle}>Carregando cartões...</Text>
          </View>
        ) : orderedCards.length > 0 ? (
          <View style={styles.list}>
            {orderedCards.map((card) => (
              <CreditCardItem
                key={card.id}
                card={card}
                invoices={invoicesByCard[card.id] ?? []}
                invoicesUnavailable={Boolean(invoicesError)}
                hidden={hidden}
                actionsDisabled={actionsDisabled}
                onOpen={() => openDetails(card)}
                onEdit={() => openEditForm(card)}
                onDeactivate={() => openDeactivationModal(card)}
                onReactivate={() => openReactivationModal(card)}
              />
            ))}
          </View>
        ) : (
          <View style={styles.stateCard}>
            <View style={styles.emptyIcon}>
              <SymbolView
                name={CARD_ICON}
                size={24}
                tintColor={colors.primary}
              />
            </View>
            <Text style={styles.stateTitle}>Nenhum cartão cadastrado</Text>
            <Text style={styles.stateDescription}>
              Cadastre um cartão de crédito para acompanhar limites, faturas e
              compras.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={openCreateForm}
              style={({ pressed }) => [
                styles.emptyAction,
                pressed && styles.pressed,
              ]}
            >
              <SymbolView
                name={ADD_ICON}
                size={14}
                tintColor={colors.primary}
              />
              <Text style={styles.emptyActionText}>Novo cartão</Text>
            </Pressable>
          </View>
        )}

        <Text style={styles.disclaimer}>
          Compras no cartão não reduzem o saldo da conta; o saldo é reduzido
          apenas no pagamento da fatura.
        </Text>
      </ScrollView>

      {formTarget ? (
        <MobileCreditCardFormModal
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
    </SafeAreaView>
  );
}

function CreditCardItem({
  card,
  invoices,
  invoicesUnavailable,
  hidden,
  actionsDisabled,
  onOpen,
  onEdit,
  onDeactivate,
  onReactivate,
}: {
  card: CreditCard;
  invoices: CreditCardInvoice[];
  invoicesUnavailable: boolean;
  hidden: boolean;
  actionsDisabled: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onDeactivate: () => void;
  onReactivate: () => void;
}) {
  const isActive = card.status === 'ACTIVE';
  const invoice = getHighlightedInvoice(invoices);
  const overdue = invoice ? isInvoiceOverdue(invoice) : false;

  return (
    <View style={[styles.card, !isActive && styles.cardInactive]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Ver detalhes do cartão ${card.name}`}
        onPress={onOpen}
        style={({ pressed }) => [
          styles.cardHeader,
          pressed && styles.pressed,
        ]}
      >
        <View
          style={[styles.cardIcon, !isActive && styles.cardIconInactive]}
        >
          <SymbolView
            name={CARD_ICON}
            size={20}
            tintColor={isActive ? colors.primary : colors.secondary}
          />
        </View>

        <View style={styles.cardIdentity}>
          <Text style={styles.cardName} numberOfLines={1}>
            {card.name}
          </Text>
          <Text style={styles.cardIssuer} numberOfLines={1}>
            {card.issuer}
          </Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            isActive ? styles.statusBadgeActive : styles.statusBadgeInactive,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              isActive ? styles.statusTextActive : styles.statusTextInactive,
            ]}
          >
            {CARD_STATUS_LABELS[card.status]}
          </Text>
        </View>
      </Pressable>

      <View style={styles.divider} />

      <View style={styles.limitsRow}>
        <View style={styles.limitBlock}>
          <Text style={styles.limitLabel}>Disponível</Text>
          <Text
            style={[styles.limitValue, !isActive && styles.mutedText]}
            numberOfLines={1}
            adjustsFontSizeToFit
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
        <Text style={styles.scheduleText}>
          Fecha dia {card.closingDay}
        </Text>
        <Text style={styles.scheduleText}>Vence dia {card.dueDay}</Text>
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

      <View style={styles.divider} />

      <View style={styles.actionsRow}>
        {isActive ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Editar ${card.name}`}
              accessibilityState={{ disabled: actionsDisabled }}
              disabled={actionsDisabled}
              onPress={onEdit}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && !actionsDisabled && styles.pressed,
                actionsDisabled && styles.disabledButton,
              ]}
            >
              <Text style={styles.secondaryButtonText}>Editar</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Desativar ${card.name}`}
              accessibilityState={{ disabled: actionsDisabled }}
              disabled={actionsDisabled}
              onPress={onDeactivate}
              style={({ pressed }) => [
                styles.deactivateButton,
                pressed && !actionsDisabled && styles.pressed,
                actionsDisabled && styles.disabledButton,
              ]}
            >
              <Text style={styles.deactivateButtonText}>Desativar</Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Reativar ${card.name}`}
            accessibilityState={{ disabled: actionsDisabled }}
            disabled={actionsDisabled}
            onPress={onReactivate}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && !actionsDisabled && styles.pressed,
              actionsDisabled && styles.disabledButton,
            ]}
          >
            <Text style={styles.secondaryButtonText}>Reativar</Text>
          </Pressable>
        )}
      </View>
    </View>
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
    paddingHorizontal: mobileSpacing.md,
    paddingTop: 16,
    paddingBottom: mobileSpacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: mobileSpacing.sm,
    marginBottom: mobileSpacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: mobileRadius.medium,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pressed: {
    opacity: 0.72,
  },
  headerTexts: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    ...mobileTypography.eyebrow,
    marginBottom: 6,
    color: colors.primary,
    fontFamily: mobileFont,
  },
  title: {
    ...mobileTypography.title,
    color: colors.text,
    fontFamily: mobileFont,
  },
  subtitle: {
    ...mobileTypography.subtitle,
    marginTop: 4,
    color: colors.secondary,
    fontFamily: mobileFont,
  },
  summaryCard: {
    backgroundColor: colors.primary,
    borderRadius: mobileRadius.large,
    paddingHorizontal: 22,
    paddingVertical: 22,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  summaryIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  summaryLabel: {
    color: '#E0EEE7',
    fontSize: 13,
    fontWeight: '500',
    fontFamily: mobileFont,
  },
  summaryAmount: {
    marginTop: 17,
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.8,
    fontVariant: ['tabular-nums'],
    fontFamily: mobileFont,
  },
  summaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 16,
  },
  summaryStat: {
    flex: 1,
    minWidth: 0,
  },
  summaryStatLabel: {
    color: '#B9D3C6',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontFamily: mobileFont,
  },
  summaryStatValue: {
    marginTop: 4,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    fontFamily: mobileFont,
  },
  summaryStatValueAvailable: {
    color: '#C9EAD9',
  },
  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  summaryHint: {
    marginTop: 15,
    color: '#B9D3C6',
    fontSize: 11,
    lineHeight: 16,
    fontFamily: mobileFont,
  },
  summaryNote: {
    marginTop: 9,
    color: colors.secondary,
    fontSize: 11,
    lineHeight: 16,
    fontFamily: mobileFont,
  },
  feedback: {
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 24,
    marginBottom: 14,
  },
  sectionHeaderTexts: {
    flexShrink: 1,
    minWidth: 0,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    fontFamily: mobileFont,
  },
  sectionCaption: {
    marginTop: 3,
    color: colors.secondary,
    fontSize: 12,
    fontFamily: mobileFont,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 11,
    backgroundColor: colors.primary,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: mobileFont,
  },
  disabledButton: {
    opacity: 0.6,
  },
  list: {
    gap: 12,
  },
  stateCard: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
    borderRadius: mobileRadius.large,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  stateTitle: {
    marginTop: 10,
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    fontFamily: mobileFont,
  },
  stateDescription: {
    marginTop: 8,
    color: colors.secondary,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    fontFamily: mobileFont,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
  },
  emptyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  emptyActionText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: mobileFont,
  },
  card: {
    gap: 14,
    padding: 17,
    borderRadius: mobileRadius.large,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cardInactive: {
    backgroundColor: '#FAFAF8',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
  },
  cardIconInactive: {
    backgroundColor: '#EEEEEA',
  },
  cardIdentity: {
    flex: 1,
    minWidth: 0,
  },
  cardName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: mobileFont,
  },
  cardIssuer: {
    marginTop: 4,
    color: colors.secondary,
    fontSize: 12,
    fontFamily: mobileFont,
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
    fontFamily: mobileFont,
  },
  statusTextActive: {
    color: colors.primary,
  },
  statusTextInactive: {
    color: colors.secondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  limitsRow: {
    flexDirection: 'row',
    gap: 18,
  },
  limitBlock: {
    flex: 1,
    minWidth: 0,
  },
  limitLabel: {
    color: colors.secondary,
    fontSize: 11,
    fontFamily: mobileFont,
  },
  limitValue: {
    marginTop: 5,
    color: colors.text,
    fontSize: 19,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    fontFamily: mobileFont,
  },
  limitValueMuted: {
    marginTop: 5,
    color: colors.secondary,
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    fontFamily: mobileFont,
  },
  mutedText: {
    color: colors.secondary,
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
    color: colors.secondary,
    fontSize: 11,
    fontFamily: mobileFont,
  },
  usagePercentage: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    fontFamily: mobileFont,
  },
  usageHint: {
    color: colors.secondary,
    fontSize: 10,
    fontFamily: mobileFont,
  },
  scheduleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  scheduleText: {
    color: colors.secondary,
    fontSize: 11,
    fontFamily: mobileFont,
  },
  invoiceBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 12,
    borderRadius: mobileRadius.small,
    backgroundColor: colors.surfaceMuted,
  },
  invoiceTexts: {
    flexShrink: 1,
    minWidth: 0,
  },
  invoiceLabel: {
    color: colors.secondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    fontFamily: mobileFont,
  },
  invoiceValue: {
    marginTop: 3,
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    fontFamily: mobileFont,
  },
  invoiceDue: {
    marginTop: 2,
    color: colors.secondary,
    fontSize: 10,
    fontFamily: mobileFont,
  },
  invoiceStatusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: colors.surface,
  },
  invoiceStatusText: {
    color: colors.secondary,
    fontSize: 10,
    fontWeight: '700',
    fontFamily: mobileFont,
  },
  overdueBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: colors.dangerLight,
  },
  overdueText: {
    color: colors.danger,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    fontFamily: mobileFont,
  },
  invoiceEmpty: {
    color: colors.secondary,
    fontSize: 11,
    fontFamily: mobileFont,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 9,
  },
  secondaryButton: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: mobileFont,
  },
  deactivateButton: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: colors.dangerLight,
  },
  deactivateButtonText: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: mobileFont,
  },
  disclaimer: {
    marginTop: 22,
    color: colors.secondary,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    fontFamily: mobileFont,
  },
});

import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { formatCurrency } from '@/components/desktop/desktop-format';
import {
  desktopColors,
  desktopFont,
  desktopLayout,
  desktopShadows,
} from '@/components/desktop/desktop-theme';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { InlineFeedback } from '@/components/feedback/inline-feedback';
import { usePrivacy } from '@/contexts/privacy-context';
import { useCreditCardPurchaseDetails } from '@/hooks/use-credit-card-purchase-details';
import type { CreditCardPurchase } from '@/services/credit-card-purchases-api';
import {
  PURCHASE_STATUS_LABELS,
  formatDateKey,
  formatInstallmentCount,
  formatInstallmentPosition,
  formatMonthYear,
  formatTimestamp,
} from '@/utils/credit-cards';
import { maskMoney } from '@/utils/privacy';

const ICONS = {
  back: { ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' },
  refresh: { ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' },
  purchase: {
    ios: 'bag',
    android: 'shopping_bag',
    web: 'shopping_bag',
  },
  invoice: {
    ios: 'doc.text',
    android: 'receipt_long',
    web: 'receipt_long',
  },
  calendar: {
    ios: 'calendar',
    android: 'calendar_month',
    web: 'calendar_month',
  },
  cancel: {
    ios: 'xmark.circle',
    android: 'cancel',
    web: 'cancel',
  },
} satisfies Record<string, SymbolViewProps['name']>;

type IconKey = keyof typeof ICONS;

function Icon({
  name,
  color,
  size = 16,
}: {
  name: IconKey;
  color: string;
  size?: number;
}) {
  return <SymbolView name={ICONS[name]} size={size} tintColor={color} />;
}

const PURCHASE_TONES: Record<
  CreditCardPurchase['status'],
  { color: string; background: string }
> = {
  ACTIVE: {
    color: desktopColors.income,
    background: desktopColors.incomeSoft,
  },
  CANCELLED: {
    color: desktopColors.expense,
    background: desktopColors.expenseSoft,
  },
};

function StatusBadge({ status }: { status: CreditCardPurchase['status'] }) {
  const tone = PURCHASE_TONES[status];

  return (
    <View style={[styles.badge, { backgroundColor: tone.background }]}>
      <Text style={[styles.badgeText, { color: tone.color }]}>
        {PURCHASE_STATUS_LABELS[status]}
      </Text>
    </View>
  );
}

function pickParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function DesktopCreditCardPurchaseDetails() {
  const router = useRouter();
  const { hidden } = usePrivacy();
  const params = useLocalSearchParams<{
    id?: string | string[];
    purchaseId?: string | string[];
  }>();

  const cardId = pickParam(params.id);
  const purchaseId = pickParam(params.purchaseId);

  const {
    card,
    purchase,
    installments,
    invoicesById,
    cardsLoading,
    cardsError,
    loading,
    error,
    hasLoadedOnce,
    refreshing,
    refresh,
    cancelling,
    cancelError,
    cancelPurchase,
    clearCancelError,
  } = useCreditCardPurchaseDetails(cardId, purchaseId);

  const [confirmOpen, setConfirmOpen] = useState(false);

  function goBack() {
    if (cardId) {
      router.push({ pathname: '/credit-cards/[id]', params: { id: cardId } });
      return;
    }

    router.push('/credit-cards');
  }

  function openInvoice(invoiceId: string) {
    if (!cardId) {
      return;
    }

    router.push({
      pathname: '/credit-cards/[id]/invoices/[invoiceId]',
      params: { id: cardId, invoiceId },
    });
  }

  async function confirmCancellation() {
    const cancelled = await cancelPurchase();

    if (cancelled) {
      setConfirmOpen(false);
    }
  }

  function closeConfirmation() {
    if (!cancelling) {
      setConfirmOpen(false);
      clearCancelError();
    }
  }

  const isInitialLoading =
    (!purchase && (cardsLoading || loading)) ||
    (!hasLoadedOnce && !error);

  if (!card || !purchase) {
    const missingCard = !card && !cardsLoading;
    const missingPurchase = !purchase && !loading && !isInitialLoading;

    return (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar para o cartão"
          onPress={goBack}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.backButtonPressed,
          ]}
        >
          <Icon name="back" size={16} color={desktopColors.primary} />
          <Text style={styles.backButtonText}>Voltar para o cartão</Text>
        </Pressable>

        <View style={styles.stateCard}>
          {isInitialLoading ? (
            <>
              <ActivityIndicator size="large" color={desktopColors.primary} />
              <Text style={styles.stateText}>Carregando compra...</Text>
            </>
          ) : (
            <>
              <View style={styles.emptyIcon}>
                <Icon
                  name="purchase"
                  size={24}
                  color={desktopColors.primary}
                />
              </View>
              <Text style={styles.stateTitle}>
                {error
                  ? 'Não foi possível carregar a compra'
                  : missingCard
                    ? 'Cartão não encontrado'
                    : missingPurchase
                      ? 'Compra não encontrada'
                      : 'Não foi possível carregar a compra'}
              </Text>
              <Text style={styles.stateText}>
                {error ??
                  (missingCard
                    ? (cardsError ??
                      'Esse cartão pode ter sido removido ou não está mais disponível.')
                    : 'Essa compra pode ter sido removida ou não está mais disponível.')}
              </Text>

              {!missingPurchase ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void refresh()}
                  disabled={refreshing}
                  style={({ pressed }) => [
                    styles.stateButton,
                    pressed && styles.stateButtonPressed,
                    refreshing && styles.buttonDisabled,
                  ]}
                >
                  <Text style={styles.stateButtonText}>
                    {refreshing ? 'Atualizando...' : 'Tentar novamente'}
                  </Text>
                </Pressable>
              ) : null}
            </>
          )}
        </View>
      </ScrollView>
    );
  }

  const isCancelled = purchase.status === 'CANCELLED';

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Voltar para o cartão"
        onPress={goBack}
        style={({ pressed }) => [
          styles.backButton,
          pressed && styles.backButtonPressed,
        ]}
      >
        <Icon name="back" size={16} color={desktopColors.primary} />
        <Text style={styles.backButtonText}>Voltar para o cartão</Text>
      </Pressable>

      <View style={styles.pageHeader}>
        <View style={styles.identity}>
          <View style={styles.purchaseIcon}>
            <Icon name="purchase" size={22} color={desktopColors.primary} />
          </View>

          <View style={styles.identityText}>
            <Text style={styles.eyebrow}>{card.name}</Text>
            <Text style={styles.title} numberOfLines={2}>
              {purchase.description}
            </Text>

            <View style={styles.identityMeta}>
              <Text style={styles.subtitle} numberOfLines={1}>
                {card.issuer}
              </Text>
              <StatusBadge status={purchase.status} />
            </View>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Atualizar compra"
          accessibilityState={{ disabled: refreshing, busy: refreshing }}
          disabled={refreshing}
          onPress={() => void refresh()}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && !refreshing && styles.secondaryButtonPressed,
            refreshing && styles.buttonDisabled,
          ]}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={desktopColors.primary} />
          ) : (
            <Icon name="refresh" size={15} color={desktopColors.primary} />
          )}
          <Text style={styles.secondaryButtonText}>
            {refreshing ? 'Atualizando...' : 'Atualizar'}
          </Text>
        </Pressable>
      </View>

      {error ? (
        <InlineFeedback
          variant="error"
          title="Não foi possível atualizar a compra"
          message={`${error} Os dados já carregados continuam disponíveis.`}
        />
      ) : null}

      {cardsError ? (
        <InlineFeedback
          variant="warning"
          title="Cartão desatualizado"
          message={`${cardsError} Os dados já carregados continuam disponíveis.`}
        />
      ) : null}

      <View style={styles.summaryCard}>
        <View style={styles.summaryTop}>
          <View style={styles.amountBlock}>
            <Text style={styles.summaryLabel}>Valor total da compra</Text>
            <Text
              style={[
                styles.totalValue,
                isCancelled && styles.totalValueCancelled,
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {maskMoney(formatCurrency(purchase.totalAmount), hidden)}
            </Text>
            {isCancelled ? (
              <Text style={styles.cancelledHint}>
                Compra cancelada; o histórico foi preservado.
              </Text>
            ) : (
              <Text style={styles.summaryHint}>
                Compromete o limite e as faturas, mas não reduz o saldo da
                conta.
              </Text>
            )}
          </View>

          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Icon
                name="calendar"
                size={13}
                color={desktopColors.textMuted}
              />
              <View>
                <Text style={styles.metaLabel}>Data da compra</Text>
                <Text style={styles.metaValue}>
                  {formatDateKey(purchase.purchaseDate)}
                </Text>
              </View>
            </View>

            <View style={styles.metaItem}>
              <Icon
                name="purchase"
                size={13}
                color={desktopColors.textMuted}
              />
              <View>
                <Text style={styles.metaLabel}>Parcelamento</Text>
                <Text style={styles.metaValue}>
                  {formatInstallmentCount(purchase.installmentCount)}
                </Text>
              </View>
            </View>

            <View style={styles.metaItem}>
              <Icon
                name="calendar"
                size={13}
                color={desktopColors.textMuted}
              />
              <View>
                <Text style={styles.metaLabel}>Registrada em</Text>
                <Text style={styles.metaValue}>
                  {formatTimestamp(purchase.createdAt)}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>Compra no cartão de crédito</Text>
        <Text style={styles.noticeText}>
          Esta compra pertence ao domínio de cartões de crédito. Ela não é uma
          despesa em Transações e não altera o saldo de nenhuma conta; o saldo
          só é reduzido no pagamento da fatura. A distribuição das parcelas é
          calculada pelo backend.
        </Text>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Parcelas e faturas</Text>
        <Text style={styles.sectionHint}>
          {installments.length}{' '}
          {installments.length === 1 ? 'parcela' : 'parcelas'}
        </Text>
      </View>

      <View style={styles.tableCard}>
        <View style={styles.tableHeader}>
          <Text style={[styles.headCell, styles.installmentCell]}>
            Parcela
          </Text>
          <Text style={[styles.headCell, styles.invoiceCell]}>Fatura</Text>
          <Text style={[styles.headCell, styles.amountCell]}>Valor</Text>
        </View>

        {loading && installments.length === 0 ? (
          <View style={styles.tableState}>
            <ActivityIndicator size="large" color={desktopColors.primary} />
            <Text style={styles.stateText}>Carregando parcelas...</Text>
          </View>
        ) : installments.length === 0 ? (
          <View style={styles.tableState}>
            <Text style={styles.stateText}>
              Esta compra não possui parcelas retornadas pela API.
            </Text>
          </View>
        ) : (
          installments.map((installment, index) => {
            const invoice = invoicesById.get(installment.invoiceId);

            return (
              <Pressable
                key={installment.id}
                accessibilityRole="button"
                accessibilityLabel={`Ver fatura da parcela ${installment.number}`}
                onPress={() => openInvoice(installment.invoiceId)}
                style={({ pressed }) => [
                  styles.row,
                  index === installments.length - 1 && styles.rowLast,
                  pressed && styles.rowPressed,
                ]}
              >
                <Text style={[styles.installmentText, styles.installmentCell]}>
                  {formatInstallmentPosition(
                    installment.number,
                    purchase.installmentCount,
                  )}
                </Text>

                <View style={styles.invoiceCell}>
                  <Text style={styles.invoiceText} numberOfLines={1}>
                    {invoice
                      ? `Fatura de ${formatMonthYear(invoice.cycleStart)}`
                      : 'Ver fatura'}
                  </Text>
                  {invoice ? (
                    <Text style={styles.invoiceMeta} numberOfLines={1}>
                      Vence em {formatDateKey(invoice.dueDate)}
                    </Text>
                  ) : null}
                </View>

                <Text
                  style={[
                    styles.amountText,
                    styles.amountCell,
                    isCancelled && styles.cancelledText,
                  ]}
                >
                  {maskMoney(formatCurrency(installment.amount), hidden)}
                </Text>
              </Pressable>
            );
          })
        )}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Cancelamento</Text>
      </View>

      {isCancelled ? (
        <View style={styles.cancelledCard}>
          <View style={styles.cancelledIcon}>
            <Icon name="cancel" size={20} color={desktopColors.expense} />
          </View>
          <View style={styles.cancelledBody}>
            <Text style={styles.cancelledTitle}>Compra cancelada</Text>
            <Text style={styles.cancelledDescription}>
              As parcelas foram removidas das faturas abertas e o registro
              permanece disponível para consulta. Nenhuma nova operação é
              necessária.
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.cancelCard}>
          <View style={styles.cancelBody}>
            <Text style={styles.cancelTitle}>Cancelar esta compra</Text>
            <Text style={styles.cancelDescription}>
              O cancelamento remove as parcelas das faturas e libera o limite
              comprometido. Só é permitido enquanto todas as faturas da compra
              estiverem abertas e sem pagamentos. O histórico da compra é
              preservado como cancelada.
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancelar compra"
            onPress={() => {
              clearCancelError();
              setConfirmOpen(true);
            }}
            style={({ pressed }) => [
              styles.cancelButton,
              pressed && styles.cancelButtonPressed,
            ]}
          >
            <Icon name="cancel" size={15} color={desktopColors.expense} />
            <Text style={styles.cancelButtonText}>Cancelar compra</Text>
          </Pressable>
        </View>
      )}

      <ConfirmDialog
        visible={confirmOpen}
        title="Cancelar compra?"
        message={`A compra "${purchase.description}" de ${maskMoney(
          formatCurrency(purchase.totalAmount),
          hidden,
        )} será cancelada. As parcelas serão removidas das faturas abertas e o limite comprometido será liberado. O histórico será preservado.`}
        confirmLabel="Cancelar compra"
        cancelLabel="Manter compra"
        tone="danger"
        loading={cancelling}
        error={cancelError}
        onConfirm={() => void confirmCancellation()}
        onCancel={closeConfirmation}
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
    gap: 18,
  },
  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingRight: 8,
    marginBottom: -4,
  },
  backButtonPressed: {
    opacity: 0.7,
  },
  backButtonText: {
    color: desktopColors.primary,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: desktopFont,
  },
  pageHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 18,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 280,
  },
  purchaseIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: desktopColors.primarySoft,
  },
  identityText: {
    flexShrink: 1,
    minWidth: 0,
  },
  eyebrow: {
    color: desktopColors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontFamily: desktopFont,
  },
  title: {
    marginTop: 3,
    color: desktopColors.text,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.8,
    fontFamily: desktopFont,
  },
  identityMeta: {
    marginTop: 7,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  subtitle: {
    color: desktopColors.textSecondary,
    fontSize: 12,
    fontFamily: desktopFont,
  },
  secondaryButton: {
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
  secondaryButtonPressed: {
    backgroundColor: desktopColors.surfaceMuted,
  },
  secondaryButtonText: {
    color: desktopColors.text,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: desktopFont,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  summaryCard: {
    gap: 18,
    padding: 22,
    borderRadius: desktopLayout.radius,
    borderWidth: 1,
    borderColor: desktopColors.border,
    backgroundColor: desktopColors.surface,
    ...desktopShadows.card,
  },
  summaryTop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 24,
  },
  amountBlock: {
    flexGrow: 1,
    flexBasis: 260,
    minWidth: 0,
    gap: 6,
  },
  summaryLabel: {
    color: desktopColors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontFamily: desktopFont,
  },
  totalValue: {
    color: desktopColors.primary,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
    fontFamily: desktopFont,
  },
  totalValueCancelled: {
    color: desktopColors.textMuted,
    textDecorationLine: 'line-through',
  },
  summaryHint: {
    color: desktopColors.textMuted,
    fontSize: 10,
    lineHeight: 16,
    fontFamily: desktopFont,
  },
  cancelledHint: {
    color: desktopColors.expense,
    fontSize: 10,
    lineHeight: 16,
    fontFamily: desktopFont,
  },
  metaGrid: {
    flexGrow: 1,
    flexBasis: 340,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    minWidth: 0,
  },
  metaLabel: {
    color: desktopColors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontFamily: desktopFont,
  },
  metaValue: {
    marginTop: 4,
    color: desktopColors.text,
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    fontFamily: desktopFont,
  },
  notice: {
    padding: 16,
    borderRadius: desktopLayout.radius,
    borderWidth: 1,
    borderColor: desktopColors.border,
    backgroundColor: desktopColors.surfaceMuted,
  },
  noticeTitle: {
    color: desktopColors.text,
    fontSize: 12,
    fontWeight: '800',
    fontFamily: desktopFont,
  },
  noticeText: {
    marginTop: 6,
    color: desktopColors.textSecondary,
    fontSize: 11,
    lineHeight: 18,
    fontFamily: desktopFont,
  },
  sectionHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 2,
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
  tableCard: {
    borderRadius: desktopLayout.radius,
    borderWidth: 1,
    borderColor: desktopColors.border,
    backgroundColor: desktopColors.surface,
    overflow: 'hidden',
    ...desktopShadows.card,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: desktopColors.border,
    backgroundColor: desktopColors.surfaceMuted,
  },
  headCell: {
    color: desktopColors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontFamily: desktopFont,
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
  rowPressed: {
    backgroundColor: desktopColors.surfaceMuted,
  },
  installmentCell: {
    width: 140,
    flexShrink: 0,
  },
  invoiceCell: {
    flexGrow: 2,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
  },
  amountCell: {
    width: 150,
    flexShrink: 0,
    textAlign: 'right',
  },
  installmentText: {
    color: desktopColors.text,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: desktopFont,
  },
  invoiceText: {
    color: desktopColors.text,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: desktopFont,
  },
  invoiceMeta: {
    marginTop: 3,
    color: desktopColors.textMuted,
    fontSize: 10,
    fontVariant: ['tabular-nums'],
    fontFamily: desktopFont,
  },
  amountText: {
    color: desktopColors.text,
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    fontFamily: desktopFont,
  },
  cancelledText: {
    color: desktopColors.textMuted,
    textDecorationLine: 'line-through',
  },
  tableState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 42,
  },
  cancelCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 18,
    padding: 20,
    borderRadius: desktopLayout.radius,
    borderWidth: 1,
    borderColor: desktopColors.expenseSoft,
    backgroundColor: desktopColors.surface,
    ...desktopShadows.card,
  },
  cancelBody: {
    flexGrow: 1,
    flexBasis: 320,
    minWidth: 0,
  },
  cancelTitle: {
    color: desktopColors.expense,
    fontSize: 13,
    fontWeight: '800',
    fontFamily: desktopFont,
  },
  cancelDescription: {
    marginTop: 5,
    color: desktopColors.textSecondary,
    fontSize: 11,
    lineHeight: 18,
    fontFamily: desktopFont,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: desktopColors.expense,
    backgroundColor: desktopColors.expenseSoft,
  },
  cancelButtonPressed: {
    opacity: 0.8,
  },
  cancelButtonText: {
    color: desktopColors.expense,
    fontSize: 12,
    fontWeight: '800',
    fontFamily: desktopFont,
  },
  cancelledCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 20,
    borderRadius: desktopLayout.radius,
    borderWidth: 1,
    borderColor: desktopColors.border,
    backgroundColor: desktopColors.surface,
    ...desktopShadows.card,
  },
  cancelledIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: desktopColors.expenseSoft,
  },
  cancelledBody: {
    flex: 1,
    minWidth: 0,
  },
  cancelledTitle: {
    color: desktopColors.text,
    fontSize: 13,
    fontWeight: '800',
    fontFamily: desktopFont,
  },
  cancelledDescription: {
    marginTop: 5,
    color: desktopColors.textSecondary,
    fontSize: 11,
    lineHeight: 18,
    fontFamily: desktopFont,
  },
  badge: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    flexShrink: 1,
    fontSize: 9,
    fontWeight: '700',
    fontFamily: desktopFont,
  },
  stateCard: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 56,
    borderRadius: desktopLayout.radius,
    borderWidth: 1,
    borderColor: desktopColors.border,
    backgroundColor: desktopColors.surface,
    ...desktopShadows.card,
  },
  stateTitle: {
    color: desktopColors.text,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    fontFamily: desktopFont,
  },
  stateText: {
    maxWidth: 440,
    color: desktopColors.textSecondary,
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
    fontFamily: desktopFont,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: desktopColors.primarySoft,
  },
  stateButton: {
    marginTop: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: desktopColors.border,
    backgroundColor: desktopColors.surface,
  },
  stateButtonPressed: {
    backgroundColor: desktopColors.surfaceMuted,
  },
  stateButtonText: {
    color: desktopColors.primary,
    fontSize: 11,
    fontWeight: '800',
    fontFamily: desktopFont,
  },
});

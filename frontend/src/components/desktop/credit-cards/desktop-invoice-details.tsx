import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { DesktopInvoicePaymentModal } from '@/components/desktop/credit-cards/desktop-invoice-payment-modal';
import { formatCurrency } from '@/components/desktop/desktop-format';
import {
  desktopColors,
  desktopFont,
  desktopLayout,
  desktopShadows,
} from '@/components/desktop/desktop-theme';
import { InlineFeedback } from '@/components/feedback/inline-feedback';
import { usePrivacy } from '@/contexts/privacy-context';
import { useInvoiceDetails } from '@/hooks/use-invoice-details';
import type { CreditCardInvoice } from '@/services/credit-card-invoices-api';
import type { CreditCardPurchase } from '@/services/credit-card-purchases-api';
import {
  INVOICE_STATUS_LABELS,
  PURCHASE_STATUS_LABELS,
  findPurchaseInstallment,
  formatDateKey,
  formatInstallmentCount,
  formatInstallmentPosition,
  formatInvoiceCycle,
  formatMonthYear,
  formatTimestamp,
  getInvoiceHighlight,
  isInvoiceOverdue,
} from '@/utils/credit-cards';
import { isInvoicePayable } from '@/utils/credit-card-payment-form';
import { maskMoney } from '@/utils/privacy';

const ICONS = {
  back: { ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' },
  invoice: {
    ios: 'doc.text',
    android: 'receipt_long',
    web: 'receipt_long',
  },
  refresh: { ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' },
  purchase: {
    ios: 'bag',
    android: 'shopping_bag',
    web: 'shopping_bag',
  },
  payment: {
    ios: 'banknote',
    android: 'payments',
    web: 'payments',
  },
  calendar: {
    ios: 'calendar',
    android: 'calendar_month',
    web: 'calendar_month',
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

type Tone = { color: string; background: string };

const INVOICE_TONES: Record<CreditCardInvoice['status'], Tone> = {
  OPEN: {
    color: desktopColors.primary,
    background: desktopColors.primarySoft,
  },
  CLOSED: {
    color: desktopColors.textSecondary,
    background: desktopColors.surfaceMuted,
  },
  PARTIALLY_PAID: {
    color: desktopColors.warning,
    background: desktopColors.warningSoft,
  },
  PAID: {
    color: desktopColors.income,
    background: desktopColors.incomeSoft,
  },
};

const PURCHASE_TONES: Record<CreditCardPurchase['status'], Tone> = {
  ACTIVE: {
    color: desktopColors.income,
    background: desktopColors.incomeSoft,
  },
  CANCELLED: {
    color: desktopColors.expense,
    background: desktopColors.expenseSoft,
  },
};

function StatusBadge({ label, tone }: { label: string; tone: Tone }) {
  return (
    <View style={[styles.badge, { backgroundColor: tone.background }]}>
      <Text style={[styles.badgeText, { color: tone.color }]}>{label}</Text>
    </View>
  );
}

function pickParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function DesktopInvoiceDetails() {
  const router = useRouter();
  const { hidden } = usePrivacy();
  const params = useLocalSearchParams<{
    id?: string | string[];
    invoiceId?: string | string[];
  }>();

  const cardId = pickParam(params.id);
  const invoiceId = pickParam(params.invoiceId);

  const {
    card,
    invoice,
    purchases,
    payments,
    accountNamesById,
    cardsLoading,
    cardsError,
    invoiceLoading,
    invoiceError,
    paymentsLoading,
    paymentsError,
    refreshing,
    hasLoadedOnce,
    refresh,
    applyPaymentResult,
    applyInvoiceSnapshot,
  } = useInvoiceDetails(cardId, invoiceId);

  const [paymentOpen, setPaymentOpen] = useState(false);

  function goBack() {
    if (cardId) {
      router.push({ pathname: '/credit-cards/[id]', params: { id: cardId } });
      return;
    }

    router.push('/credit-cards');
  }

  function openPurchase(purchaseId: string) {
    if (!cardId) {
      return;
    }

    router.push({
      pathname: '/credit-cards/[id]/purchases/[purchaseId]',
      params: { id: cardId, purchaseId },
    });
  }

  const isInitialLoading =
    (!invoice && (cardsLoading || invoiceLoading)) ||
    (!hasLoadedOnce && !invoiceError);

  if (!card || !invoice) {
    const missingCard = !card && !cardsLoading;
    const missingInvoice = !invoice && !invoiceLoading && !isInitialLoading;

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
              <Text style={styles.stateText}>Carregando fatura...</Text>
            </>
          ) : (
            <>
              <View style={styles.emptyIcon}>
                <Icon
                  name="invoice"
                  size={24}
                  color={desktopColors.primary}
                />
              </View>
              <Text style={styles.stateTitle}>
                {invoiceError
                  ? 'Não foi possível carregar a fatura'
                  : missingCard
                    ? 'Cartão não encontrado'
                    : missingInvoice
                      ? 'Fatura não encontrada'
                      : 'Não foi possível carregar a fatura'}
              </Text>
              <Text style={styles.stateText}>
                {invoiceError ??
                  (missingCard
                    ? (cardsError ??
                      'Esse cartão pode ter sido removido ou não está mais disponível.')
                    : 'Essa fatura pode ter sido removida ou não está mais disponível.')}
              </Text>

              {!missingInvoice ? (
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

  const overdue = isInvoiceOverdue(invoice);
  const highlight = getInvoiceHighlight(invoice);
  const payable = isInvoicePayable(invoice.status);
  const hasPurchases = purchases.length > 0;
  const hasPayments = payments.length > 0;

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
          <View style={styles.invoiceIcon}>
            <Icon name="invoice" size={22} color={desktopColors.primary} />
          </View>

          <View style={styles.identityText}>
            <Text style={styles.eyebrow}>{card.name}</Text>
            <Text style={styles.title} numberOfLines={1}>
              Fatura de {formatMonthYear(invoice.cycleStart)}
            </Text>

            <View style={styles.identityMeta}>
              <Text style={styles.subtitle} numberOfLines={1}>
                {card.issuer}
              </Text>
              <StatusBadge
                label={INVOICE_STATUS_LABELS[invoice.status]}
                tone={INVOICE_TONES[invoice.status]}
              />
              {overdue ? (
                <View style={styles.overdueBadge}>
                  <Text style={styles.overdueText}>Atrasada</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.headerActions}>
          {payable ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Pagar fatura"
              onPress={() => setPaymentOpen(true)}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.primaryButtonPressed,
              ]}
            >
              <Icon name="payment" size={15} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Pagar fatura</Text>
            </Pressable>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Atualizar fatura"
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
      </View>

      {invoiceError ? (
        <InlineFeedback
          variant="error"
          title="Não foi possível atualizar a fatura"
          message={`${invoiceError} Os dados já carregados continuam disponíveis.`}
        />
      ) : null}

      <View style={styles.summaryCard}>
        <View style={styles.summaryTop}>
          <View style={styles.remainingBlock}>
            <Text style={styles.summaryLabel}>Saldo restante</Text>
            <Text
              style={[
                styles.remainingValue,
                overdue && styles.remainingValueOverdue,
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {maskMoney(formatCurrency(invoice.remainingAmount), hidden)}
            </Text>

            {highlight ? (
              <View
                style={[
                  styles.highlightBadge,
                  highlight.kind === 'overdue' && styles.highlightBadgeOverdue,
                ]}
              >
                <Text
                  style={[
                    styles.highlightBadgeText,
                    highlight.kind === 'overdue' &&
                      styles.highlightBadgeTextOverdue,
                  ]}
                >
                  {highlight.label}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Período</Text>
              <Text style={styles.metaValue}>
                {formatInvoiceCycle(invoice)}
              </Text>
            </View>

            <View style={styles.metaItem}>
              <Icon
                name="calendar"
                size={13}
                color={desktopColors.textMuted}
              />
              <View>
                <Text style={styles.metaLabel}>Fechamento</Text>
                <Text style={styles.metaValue}>
                  {formatDateKey(invoice.closingDate)}
                </Text>
              </View>
            </View>

            <View style={styles.metaItem}>
              <Icon
                name="calendar"
                size={13}
                color={
                  overdue ? desktopColors.expense : desktopColors.textMuted
                }
              />
              <View>
                <Text style={styles.metaLabel}>Vencimento</Text>
                <Text
                  style={[
                    styles.metaValue,
                    overdue && styles.metaValueOverdue,
                  ]}
                >
                  {formatDateKey(invoice.dueDate)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.amountsRow}>
          <View style={styles.amountBlock}>
            <Text style={styles.metaLabel}>Valor original</Text>
            <Text style={styles.amountValue}>
              {maskMoney(formatCurrency(invoice.totalAmount), hidden)}
            </Text>
          </View>

          <View style={styles.amountBlock}>
            <Text style={styles.metaLabel}>Valor pago</Text>
            <Text style={styles.amountValueMuted}>
              {maskMoney(formatCurrency(invoice.paidAmount), hidden)}
            </Text>
          </View>

          <Text style={styles.summaryHint}>
            Valores calculados e enviados pelo backend.
          </Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Compras e parcelas</Text>
        <Text style={styles.sectionHint}>
          {purchases.length}{' '}
          {purchases.length === 1 ? 'compra nesta fatura' : 'compras nesta fatura'}
        </Text>
      </View>

      {invoiceError ? (
        <View style={styles.sectionError}>
          <InlineFeedback
            variant="warning"
            title="Compras desatualizadas"
            message="Não foi possível confirmar as compras desta fatura."
          />
        </View>
      ) : null}

      <View style={styles.tableCard}>
        <View style={styles.tableHeader}>
          <Text style={[styles.headCell, styles.descriptionCell]}>
            Descrição
          </Text>
          <Text style={[styles.headCell, styles.dateCell]}>Compra</Text>
          <Text style={[styles.headCell, styles.installmentCell]}>
            Parcela
          </Text>
          <Text style={[styles.headCell, styles.amountCell]}>
            Valor da parcela
          </Text>
          <Text style={[styles.headCell, styles.amountCell]}>
            Total da compra
          </Text>
          <Text style={[styles.headCell, styles.countCell]}>Parcelas</Text>
          <Text style={[styles.headCell, styles.statusCell]}>Status</Text>
        </View>

        {invoiceLoading && !hasPurchases ? (
          <View style={styles.tableState}>
            <ActivityIndicator size="large" color={desktopColors.primary} />
            <Text style={styles.stateText}>Carregando compras...</Text>
          </View>
        ) : invoiceError && !hasPurchases ? (
          <View style={styles.tableState}>
            <View style={styles.emptyIcon}>
              <Icon name="purchase" size={24} color={desktopColors.primary} />
            </View>
            <Text style={styles.stateTitle}>
              Compras temporariamente indisponíveis
            </Text>
            <Text style={styles.stateText}>
              Não foi possível confirmar as compras desta fatura. Tente
              atualizar novamente.
            </Text>
          </View>
        ) : !hasPurchases ? (
          <View style={styles.tableState}>
            <View style={styles.emptyIcon}>
              <Icon name="purchase" size={24} color={desktopColors.primary} />
            </View>
            <Text style={styles.stateTitle}>Nenhuma compra nesta fatura</Text>
            <Text style={styles.stateText}>
              As compras e parcelas associadas a esta fatura aparecerão aqui.
            </Text>
          </View>
        ) : (
          purchases.map((purchase, index) => {
            const installment = findPurchaseInstallment(
              purchase,
              invoice.id,
            );
            const cancelled = purchase.status === 'CANCELLED';

            return (
              <Pressable
                key={purchase.id}
                accessibilityRole="button"
                accessibilityLabel={`Ver detalhes da compra ${purchase.description}`}
                onPress={() => openPurchase(purchase.id)}
                style={({ pressed }) => [
                  styles.row,
                  index === purchases.length - 1 && styles.rowLast,
                  pressed && styles.rowPressed,
                ]}
              >
                <View style={styles.descriptionCell}>
                  <Text
                    style={[
                      styles.descriptionText,
                      cancelled && styles.cancelledText,
                    ]}
                    numberOfLines={1}
                  >
                    {purchase.description}
                  </Text>
                </View>

                <Text style={[styles.dateText, styles.dateCell]}>
                  {formatDateKey(purchase.purchaseDate)}
                </Text>

                <Text
                  style={[styles.installmentText, styles.installmentCell]}
                >
                  {installment
                    ? formatInstallmentPosition(
                        installment.number,
                        purchase.installmentCount,
                      )
                    : 'Parcela não identificada'}
                </Text>

                <Text
                  style={[
                    styles.amountText,
                    styles.amountCell,
                    cancelled && styles.cancelledText,
                  ]}
                >
                  {installment
                    ? maskMoney(
                        formatCurrency(installment.amount),
                        hidden,
                      )
                    : '—'}
                </Text>

                <Text
                  style={[
                    styles.amountTextMuted,
                    styles.amountCell,
                    cancelled && styles.cancelledText,
                  ]}
                >
                  {maskMoney(
                    formatCurrency(purchase.totalAmount),
                    hidden,
                  )}
                </Text>

                <Text style={[styles.countText, styles.countCell]}>
                  {formatInstallmentCount(purchase.installmentCount)}
                </Text>

                <View style={styles.statusCell}>
                  <StatusBadge
                    label={PURCHASE_STATUS_LABELS[purchase.status]}
                    tone={PURCHASE_TONES[purchase.status]}
                  />
                </View>
              </Pressable>
            );
          })
        )}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Pagamentos</Text>
        <Text style={styles.sectionHint}>
          {payments.length}{' '}
          {payments.length === 1 ? 'pagamento registrado' : 'pagamentos registrados'}
        </Text>
      </View>

      {paymentsError ? (
        <View style={styles.sectionError}>
          <InlineFeedback
            variant="error"
            title="Não foi possível carregar os pagamentos"
            message={paymentsError}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => void refresh()}
            disabled={refreshing}
            style={({ pressed }) => [
              styles.retryButton,
              pressed && !refreshing && styles.stateButtonPressed,
              refreshing && styles.buttonDisabled,
            ]}
          >
            <Text style={styles.retryButtonText}>
              {refreshing ? 'Atualizando...' : 'Tentar novamente'}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.tableCard}>
        <View style={styles.tableHeader}>
          <Text style={[styles.headCell, styles.timestampCell]}>
            Data e hora
          </Text>
          <Text style={[styles.headCell, styles.accountCell]}>Conta</Text>
          <Text style={[styles.headCell, styles.paymentAmountCell]}>
            Valor pago
          </Text>
        </View>

        {paymentsLoading && !hasPayments ? (
          <View style={styles.tableState}>
            <ActivityIndicator size="large" color={desktopColors.primary} />
            <Text style={styles.stateText}>Carregando pagamentos...</Text>
          </View>
        ) : paymentsError && !hasPayments ? (
          <View style={styles.tableState}>
            <View style={styles.emptyIcon}>
              <Icon name="payment" size={24} color={desktopColors.primary} />
            </View>
            <Text style={styles.stateTitle}>
              Pagamentos temporariamente indisponíveis
            </Text>
            <Text style={styles.stateText}>
              Não foi possível confirmar os pagamentos desta fatura. Tente
              atualizar novamente.
            </Text>
          </View>
        ) : !hasPayments ? (
          <View style={styles.tableState}>
            <View style={styles.emptyIcon}>
              <Icon name="payment" size={24} color={desktopColors.primary} />
            </View>
            <Text style={styles.stateTitle}>Nenhum pagamento registrado</Text>
            <Text style={styles.stateText}>
              {invoice.status === 'OPEN'
                ? 'Pagamentos ficam disponíveis após o fechamento da fatura.'
                : 'Os pagamentos desta fatura aparecerão aqui quando forem registrados.'}
            </Text>
          </View>
        ) : (
          payments.map((payment, index) => (
            <View
              key={payment.id}
              style={[
                styles.row,
                index === payments.length - 1 && styles.rowLast,
              ]}
            >
              <Text style={[styles.dateText, styles.timestampCell]}>
                {formatTimestamp(payment.paidAt)}
              </Text>

              <Text
                style={[styles.accountText, styles.accountCell]}
                numberOfLines={1}
              >
                {accountNamesById.get(payment.accountId) ??
                  'Conta não identificada'}
              </Text>

              <Text
                style={[
                  styles.paymentAmountText,
                  styles.paymentAmountCell,
                ]}
              >
                {maskMoney(formatCurrency(payment.amount), hidden)}
              </Text>
            </View>
          ))
        )}
      </View>

      <Text style={styles.disclaimer}>
        Pagamentos de fatura reduzem o saldo da conta utilizada. Os valores e a
        distribuição das parcelas são calculados pelo backend.
      </Text>

      {paymentOpen ? (
        <DesktopInvoicePaymentModal
          cardId={card.id}
          cardName={card.name}
          invoice={invoice}
          onClose={() => setPaymentOpen(false)}
          onConfirmed={applyPaymentResult}
          onInvoiceUpdated={applyInvoiceSnapshot}
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
  invoiceIcon: {
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
  headerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
  },
  primaryButton: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: desktopColors.primary,
  },
  primaryButtonPressed: {
    opacity: 0.85,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: desktopFont,
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
  remainingBlock: {
    flexGrow: 1,
    flexBasis: 240,
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
  remainingValue: {
    color: desktopColors.primary,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
    fontFamily: desktopFont,
  },
  remainingValueOverdue: {
    color: desktopColors.expense,
  },
  highlightBadge: {
    alignSelf: 'flex-start',
    marginTop: 2,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: desktopColors.primarySoft,
  },
  highlightBadgeOverdue: {
    backgroundColor: desktopColors.expenseSoft,
  },
  highlightBadgeText: {
    color: desktopColors.primary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    fontFamily: desktopFont,
  },
  highlightBadgeTextOverdue: {
    color: desktopColors.expense,
  },
  metaGrid: {
    flexGrow: 1,
    flexBasis: 320,
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
  metaValueOverdue: {
    color: desktopColors.expense,
  },
  divider: {
    height: 1,
    backgroundColor: desktopColors.border,
  },
  amountsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    gap: 28,
  },
  amountBlock: {
    minWidth: 140,
    gap: 4,
  },
  amountValue: {
    color: desktopColors.text,
    fontSize: 17,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    fontFamily: desktopFont,
  },
  amountValueMuted: {
    color: desktopColors.textSecondary,
    fontSize: 17,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    fontFamily: desktopFont,
  },
  summaryHint: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 180,
    color: desktopColors.textMuted,
    fontSize: 10,
    textAlign: 'right',
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
  sectionError: {
    gap: 10,
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
  descriptionCell: {
    flexGrow: 2,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
  },
  dateCell: {
    width: 96,
    flexShrink: 0,
  },
  installmentCell: {
    width: 124,
    flexShrink: 0,
  },
  amountCell: {
    width: 124,
    flexShrink: 0,
    textAlign: 'right',
  },
  countCell: {
    width: 96,
    flexShrink: 0,
  },
  statusCell: {
    width: 112,
    flexShrink: 0,
    alignItems: 'flex-start',
  },
  descriptionText: {
    color: desktopColors.text,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: desktopFont,
  },
  dateText: {
    color: desktopColors.text,
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    fontFamily: desktopFont,
  },
  installmentText: {
    color: desktopColors.textSecondary,
    fontSize: 11,
    fontFamily: desktopFont,
  },
  amountText: {
    color: desktopColors.text,
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    fontFamily: desktopFont,
  },
  amountTextMuted: {
    color: desktopColors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    fontFamily: desktopFont,
  },
  countText: {
    color: desktopColors.textSecondary,
    fontSize: 11,
    fontFamily: desktopFont,
  },
  cancelledText: {
    color: desktopColors.textMuted,
    textDecorationLine: 'line-through',
  },
  timestampCell: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
  },
  accountCell: {
    flexGrow: 2,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
  },
  paymentAmountCell: {
    width: 150,
    flexShrink: 0,
    textAlign: 'right',
  },
  accountText: {
    color: desktopColors.text,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: desktopFont,
  },
  paymentAmountText: {
    color: desktopColors.income,
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
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
  overdueBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: desktopColors.expenseSoft,
  },
  overdueText: {
    color: desktopColors.expense,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    fontFamily: desktopFont,
  },
  retryButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: desktopColors.border,
    backgroundColor: desktopColors.surface,
  },
  retryButtonText: {
    color: desktopColors.primary,
    fontSize: 11,
    fontWeight: '800',
    fontFamily: desktopFont,
  },
  tableState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 42,
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
  disclaimer: {
    marginTop: 2,
    color: desktopColors.textMuted,
    fontSize: 10,
    lineHeight: 16,
    textAlign: 'center',
    fontFamily: desktopFont,
  },
});

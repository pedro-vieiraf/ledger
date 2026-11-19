import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { MobileInvoicePaymentModal } from '@/components/credit-cards/mobile-invoice-payment-modal';
import { DesktopInvoiceDetails } from '@/components/desktop/credit-cards/desktop-invoice-details';
import { InlineFeedback } from '@/components/feedback/inline-feedback';
import {
  mobileColors,
  mobileFont,
  mobileRadius,
  mobileSpacing,
  mobileTypography,
} from '@/constants/mobile-theme';
import { useInvoiceDetails } from '@/hooks/use-invoice-details';
import { useIsDesktopLayout } from '@/hooks/use-is-desktop-layout';
import { usePrivacy } from '@/contexts/privacy-context';
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
  warning: '#A36A1F',
  warningLight: '#FBF3E2',
};

const ICONS = {
  back: { ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' },
  refresh: { ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' },
  invoice: {
    ios: 'doc.text',
    android: 'receipt_long',
    web: 'receipt_long',
  },
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

function Icon({ name, color, size = 16 }: { name: IconKey; color: string; size?: number }) {
  return <SymbolView name={ICONS[name]} size={size} tintColor={color} />;
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

type BadgeTone = { color: string; background: string };

const INVOICE_TONES: Record<CreditCardInvoice['status'], BadgeTone> = {
  OPEN: { color: colors.primary, background: colors.primaryLight },
  CLOSED: { color: colors.secondary, background: colors.surfaceMuted },
  PARTIALLY_PAID: { color: colors.warning, background: colors.warningLight },
  PAID: { color: colors.income, background: colors.incomeLight },
};

const PURCHASE_TONES: Record<CreditCardPurchase['status'], BadgeTone> = {
  ACTIVE: { color: colors.income, background: colors.incomeLight },
  CANCELLED: { color: colors.danger, background: colors.dangerLight },
};

function ModuleBadge({ label, tone }: { label: string; tone: BadgeTone }) {
  return (
    <View style={[styles.badge, { backgroundColor: tone.background }]}>
      <Text style={[styles.badgeText, { color: tone.color }]}>{label}</Text>
    </View>
  );
}

function pickParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function InvoiceDetailsScreen() {
  const isDesktop = useIsDesktopLayout();

  if (isDesktop) {
    return <DesktopInvoiceDetails />;
  }

  return <InvoiceDetailsMobileScreen />;
}

function InvoiceDetailsMobileScreen() {
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

    router.replace('/credit-cards');
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
    const missingInvoice = !invoice && !invoiceLoading;

    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />

        <View style={styles.centeredContent}>
          {isInitialLoading ? (
            <>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Carregando fatura...</Text>
            </>
          ) : (
            <>
              <Text style={styles.notFoundTitle}>
                {invoiceError
                  ? 'Não foi possível carregar a fatura'
                  : missingCard
                    ? 'Cartão não encontrado'
                    : 'Fatura não encontrada'}
              </Text>
              <Text style={styles.notFoundDescription}>
                {invoiceError ??
                  (missingCard
                    ? (cardsError ??
                      'Esse cartão pode ter sido removido ou não está mais disponível.')
                    : 'Essa fatura pode ter sido removida ou não está mais disponível.')}
              </Text>

              <Pressable
                accessibilityRole="button"
                onPress={goBack}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.primaryButtonText}>Voltar</Text>
              </Pressable>

              {invoiceError && !missingInvoice ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void refresh()}
                  disabled={refreshing}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    pressed && styles.pressed,
                    refreshing && styles.disabled,
                  ]}
                >
                  <Text style={styles.secondaryButtonText}>
                    {refreshing ? 'Atualizando...' : 'Tentar novamente'}
                  </Text>
                </Pressable>
              ) : null}
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const overdue = isInvoiceOverdue(invoice);
  const highlight = getInvoiceHighlight(invoice);
  const payable = isInvoicePayable(invoice.status);
  const purchasesUnavailable =
    Boolean(invoiceError) && purchases.length === 0;
  const paymentsUnavailable =
    Boolean(paymentsError) && payments.length === 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voltar para o cartão"
            onPress={goBack}
            style={({ pressed }) => [
              styles.iconButton,
              pressed && styles.pressed,
            ]}
          >
            <Icon name="back" size={20} color={colors.primary} />
          </Pressable>

          <View style={styles.headerTexts}>
            <Text style={styles.eyebrow}>{card.name}</Text>
            <Text style={styles.title} numberOfLines={2}>
              Fatura de {formatMonthYear(invoice.cycleStart)}
            </Text>

            <View style={styles.identityMeta}>
              <Text style={styles.subtitle} numberOfLines={1}>
                {card.issuer}
              </Text>
              <ModuleBadge
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

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Atualizar fatura"
            accessibilityState={{ disabled: refreshing, busy: refreshing }}
            disabled={refreshing}
            onPress={() => void refresh()}
            style={({ pressed }) => [
              styles.iconButton,
              pressed && !refreshing && styles.pressed,
              refreshing && styles.disabled,
            ]}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Icon name="refresh" size={19} color={colors.primary} />
            )}
          </Pressable>
        </View>

        {invoiceError ? (
          <InlineFeedback
            variant="error"
            title="Não foi possível atualizar a fatura"
            message={`${invoiceError} Os dados já carregados continuam disponíveis.`}
            style={styles.feedback}
          />
        ) : null}

        <View style={styles.summaryCard}>
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

          <View style={styles.divider} />

          <View style={styles.amountsRow}>
            <View style={styles.amountBlock}>
              <Text style={styles.summaryLabel}>Valor original</Text>
              <Text style={styles.amountValue} numberOfLines={1}>
                {maskMoney(formatCurrency(invoice.totalAmount), hidden)}
              </Text>
            </View>

            <View style={styles.amountBlock}>
              <Text style={styles.summaryLabel}>Valor pago</Text>
              <Text style={styles.amountValueMuted} numberOfLines={1}>
                {maskMoney(formatCurrency(invoice.paidAmount), hidden)}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailsBlock}>
            <DetailRow
              label="Período"
              value={formatInvoiceCycle(invoice)}
            />
            <DetailRow
              label="Fechamento"
              value={formatDateKey(invoice.closingDate)}
            />
            <DetailRow
              label="Vencimento"
              value={formatDateKey(invoice.dueDate)}
              danger={overdue}
            />
          </View>
        </View>

        {payable ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Pagar fatura"
            onPress={() => setPaymentOpen(true)}
            style={({ pressed }) => [
              styles.paymentButton,
              pressed && styles.pressed,
            ]}
          >
            <Icon name="payment" size={18} color="#FFFFFF" />
            <Text style={styles.paymentButtonText}>Pagar fatura</Text>
          </Pressable>
        ) : invoice.status === 'OPEN' ? (
          <Text style={styles.paymentHint}>
            Pagamentos ficam disponíveis após o fechamento da fatura.
          </Text>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Compras e parcelas</Text>
          <Text style={styles.sectionCaption}>
            {purchases.length}{' '}
            {purchases.length === 1 ? 'compra' : 'compras'}
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

        {invoiceLoading && purchases.length === 0 ? (
          <View style={styles.stateCard}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.stateTitle}>Carregando compras...</Text>
          </View>
        ) : purchasesUnavailable ? null : purchases.length === 0 ? (
          <View style={styles.stateCard}>
            <View style={styles.emptyIcon}>
              <Icon name="purchase" size={24} color={colors.primary} />
            </View>
            <Text style={styles.stateTitle}>Nenhuma compra nesta fatura</Text>
            <Text style={styles.stateDescription}>
              As compras e parcelas associadas a esta fatura aparecerão aqui.
            </Text>
          </View>
        ) : (
          <View style={styles.purchasesCard}>
            {purchases.map((purchase, index) => (
              <PurchaseItem
                key={purchase.id}
                purchase={purchase}
                invoiceId={invoice.id}
                hidden={hidden}
                last={index === purchases.length - 1}
                onOpen={() => openPurchase(purchase.id)}
              />
            ))}
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Pagamentos</Text>
          <Text style={styles.sectionCaption}>
            {payments.length}{' '}
            {payments.length === 1 ? 'pagamento' : 'pagamentos'}
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
                pressed && !refreshing && styles.pressed,
                refreshing && styles.disabled,
              ]}
            >
              <Text style={styles.retryButtonText}>
                {refreshing ? 'Atualizando...' : 'Tentar novamente'}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {paymentsLoading && payments.length === 0 ? (
          <View style={styles.stateCard}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.stateTitle}>Carregando pagamentos...</Text>
          </View>
        ) : paymentsUnavailable ? null : payments.length === 0 ? (
          <View style={styles.stateCard}>
            <View style={styles.emptyIcon}>
              <Icon name="payment" size={24} color={colors.primary} />
            </View>
            <Text style={styles.stateTitle}>Nenhum pagamento registrado</Text>
            <Text style={styles.stateDescription}>
              {invoice.status === 'OPEN'
                ? 'Pagamentos ficam disponíveis após o fechamento da fatura.'
                : 'Os pagamentos desta fatura aparecerão aqui quando forem registrados.'}
            </Text>
          </View>
        ) : (
          <View style={styles.paymentsCard}>
            {payments.map((payment, index) => (
              <View
                key={payment.id}
                style={[
                  styles.paymentRow,
                  index !== payments.length - 1 && styles.rowDivider,
                ]}
              >
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentAccount} numberOfLines={1}>
                    {accountNamesById.get(payment.accountId) ??
                      'Conta não identificada'}
                  </Text>
                  <Text style={styles.paymentDate}>
                    {formatTimestamp(payment.paidAt)}
                  </Text>
                </View>

                <Text
                  style={styles.paymentAmount}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {maskMoney(formatCurrency(payment.amount), hidden)}
                </Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.disclaimer}>
          Pagamentos de fatura reduzem o saldo da conta utilizada. Os valores e
          a distribuição das parcelas são calculados pelo backend.
        </Text>

        {paymentOpen ? (
          <MobileInvoicePaymentModal
            cardId={card.id}
            cardName={card.name}
            invoice={invoice}
            onClose={() => setPaymentOpen(false)}
            onConfirmed={applyPaymentResult}
            onInvoiceUpdated={applyInvoiceSnapshot}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({
  label,
  value,
  danger,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailLabelGroup}>
        <Icon
          name="calendar"
          size={13}
          color={danger ? colors.danger : colors.secondary}
        />
        <Text style={styles.detailLabel}>{label}</Text>
      </View>
      <Text
        style={[styles.detailValue, danger && styles.detailValueDanger]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

function PurchaseItem({
  purchase,
  invoiceId,
  hidden,
  last,
  onOpen,
}: {
  purchase: CreditCardPurchase;
  invoiceId: string;
  hidden: boolean;
  last: boolean;
  onOpen: () => void;
}) {
  const installment = findPurchaseInstallment(purchase, invoiceId);
  const cancelled = purchase.status === 'CANCELLED';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ver detalhes da compra ${purchase.description}`}
      onPress={onOpen}
      style={({ pressed }) => [
        styles.purchaseRow,
        !last && styles.rowDivider,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.purchaseInfo}>
        <Text
          style={[
            styles.purchaseDescription,
            cancelled && styles.cancelled,
          ]}
          numberOfLines={2}
        >
          {purchase.description}
        </Text>

        <Text style={styles.purchaseMeta} numberOfLines={1}>
          {formatDateKey(purchase.purchaseDate)} ·{' '}
          {installment
            ? formatInstallmentPosition(
                installment.number,
                purchase.installmentCount,
              )
            : 'Parcela não identificada'}
        </Text>

        <Text style={styles.purchaseSubmeta} numberOfLines={1}>
          Total {maskMoney(formatCurrency(purchase.totalAmount), hidden)} ·{' '}
          {formatInstallmentCount(purchase.installmentCount)}
        </Text>
      </View>

      <View style={styles.purchaseRight}>
        <Text
          style={[styles.purchaseAmount, cancelled && styles.cancelled]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {installment
            ? maskMoney(formatCurrency(installment.amount), hidden)
            : '—'}
        </Text>
        <ModuleBadge
          label={PURCHASE_STATUS_LABELS[purchase.status]}
          tone={PURCHASE_TONES[purchase.status]}
        />
      </View>
    </Pressable>
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
  centeredContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 12,
  },
  loadingText: {
    color: colors.secondary,
    fontSize: 13,
    fontFamily: mobileFont,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: mobileSpacing.sm,
    marginBottom: mobileSpacing.md,
  },
  iconButton: {
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
  disabled: {
    opacity: 0.5,
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
  identityMeta: {
    marginTop: 6,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  subtitle: {
    flexShrink: 1,
    color: colors.secondary,
    fontSize: 13,
    fontFamily: mobileFont,
  },
  feedback: {
    marginBottom: 16,
  },
  summaryCard: {
    gap: 16,
    padding: 18,
    borderRadius: mobileRadius.large,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  remainingBlock: {
    gap: 5,
  },
  summaryLabel: {
    color: colors.secondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontFamily: mobileFont,
  },
  remainingValue: {
    color: colors.primary,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.8,
    fontVariant: ['tabular-nums'],
    fontFamily: mobileFont,
  },
  remainingValueOverdue: {
    color: colors.danger,
  },
  highlightBadge: {
    alignSelf: 'flex-start',
    marginTop: 3,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.primaryLight,
  },
  highlightBadgeOverdue: {
    backgroundColor: colors.dangerLight,
  },
  highlightBadgeText: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    fontFamily: mobileFont,
  },
  highlightBadgeTextOverdue: {
    color: colors.danger,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  amountsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  amountBlock: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  amountValue: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    fontFamily: mobileFont,
  },
  amountValueMuted: {
    color: colors.secondary,
    fontSize: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    fontFamily: mobileFont,
  },
  detailsBlock: {
    gap: 9,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  detailLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailLabel: {
    color: colors.secondary,
    fontSize: 11,
    fontFamily: mobileFont,
  },
  detailValue: {
    flexShrink: 1,
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
    fontFamily: mobileFont,
  },
  detailValueDanger: {
    color: colors.danger,
  },
  paymentButton: {
    marginTop: 14,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: mobileRadius.medium,
    backgroundColor: colors.primary,
  },
  paymentButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: mobileFont,
  },
  paymentHint: {
    marginTop: 12,
    color: colors.secondary,
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    fontFamily: mobileFont,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 24,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    fontFamily: mobileFont,
  },
  sectionCaption: {
    color: colors.secondary,
    fontSize: 12,
    fontFamily: mobileFont,
  },
  sectionError: {
    gap: 10,
    marginTop: 12,
  },
  purchasesCard: {
    marginTop: 12,
    paddingHorizontal: 15,
    borderRadius: mobileRadius.large,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  purchaseRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 14,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  purchaseInfo: {
    flex: 1,
    minWidth: 0,
  },
  purchaseDescription: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: mobileFont,
  },
  purchaseMeta: {
    marginTop: 4,
    color: colors.secondary,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    fontFamily: mobileFont,
  },
  purchaseSubmeta: {
    marginTop: 3,
    color: colors.secondary,
    fontSize: 10,
    fontVariant: ['tabular-nums'],
    fontFamily: mobileFont,
  },
  purchaseRight: {
    alignItems: 'flex-end',
    gap: 6,
    maxWidth: '45%',
  },
  purchaseAmount: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    fontFamily: mobileFont,
  },
  cancelled: {
    color: colors.secondary,
    textDecorationLine: 'line-through',
  },
  paymentsCard: {
    marginTop: 12,
    paddingHorizontal: 15,
    borderRadius: mobileRadius.large,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 14,
  },
  paymentInfo: {
    flex: 1,
    minWidth: 0,
  },
  paymentAccount: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: mobileFont,
  },
  paymentDate: {
    marginTop: 3,
    color: colors.secondary,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    fontFamily: mobileFont,
  },
  paymentAmount: {
    color: colors.income,
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    fontFamily: mobileFont,
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
    fontFamily: mobileFont,
  },
  overdueBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.dangerLight,
  },
  overdueText: {
    color: colors.danger,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    fontFamily: mobileFont,
  },
  retryButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  retryButtonText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: mobileFont,
  },
  stateCard: {
    alignItems: 'center',
    marginTop: 12,
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
  disclaimer: {
    marginTop: 22,
    color: colors.secondary,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    fontFamily: mobileFont,
  },
  notFoundTitle: {
    color: colors.text,
    fontSize: 21,
    fontWeight: '700',
    textAlign: 'center',
    fontFamily: mobileFont,
  },
  notFoundDescription: {
    color: colors.secondary,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: mobileFont,
  },
  primaryButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: mobileFont,
  },
  secondaryButton: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: mobileFont,
  },
});

import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { DesktopCreditCardPurchaseDetails } from '@/components/desktop/credit-cards/desktop-credit-card-purchase-details';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { InlineFeedback } from '@/components/feedback/inline-feedback';
import {
  mobileColors,
  mobileFont,
  mobileRadius,
  mobileSpacing,
  mobileTypography,
} from '@/constants/mobile-theme';
import { useCreditCardPurchaseDetails } from '@/hooks/use-credit-card-purchase-details';
import { useIsDesktopLayout } from '@/hooks/use-is-desktop-layout';
import { usePrivacy } from '@/contexts/privacy-context';
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

const ICONS = {
  back: { ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' },
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
  chevron: {
    ios: 'chevron.right',
    android: 'chevron_right',
    web: 'chevron_right',
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

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

const PURCHASE_TONES: Record<
  CreditCardPurchase['status'],
  { color: string; background: string }
> = {
  ACTIVE: { color: colors.income, background: colors.incomeLight },
  CANCELLED: { color: colors.danger, background: colors.dangerLight },
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

export default function CreditCardPurchaseDetailsScreen() {
  const isDesktop = useIsDesktopLayout();

  if (isDesktop) {
    return <DesktopCreditCardPurchaseDetails />;
  }

  return <CreditCardPurchaseDetailsMobileScreen />;
}

function CreditCardPurchaseDetailsMobileScreen() {
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

    router.replace('/credit-cards');
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
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />

        <View style={styles.centeredContent}>
          {isInitialLoading ? (
            <>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Carregando compra...</Text>
            </>
          ) : (
            <>
              <Text style={styles.notFoundTitle}>
                {error
                  ? 'Não foi possível carregar a compra'
                  : missingCard
                    ? 'Cartão não encontrado'
                    : missingPurchase
                      ? 'Compra não encontrada'
                      : 'Não foi possível carregar a compra'}
              </Text>
              <Text style={styles.notFoundDescription}>
                {error ??
                  (missingCard
                    ? (cardsError ??
                      'Esse cartão pode ter sido removido ou não está mais disponível.')
                    : 'Essa compra pode ter sido removida ou não está mais disponível.')}
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

              {!missingPurchase ? (
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

  const isCancelled = purchase.status === 'CANCELLED';

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
              {purchase.description}
            </Text>

            <View style={styles.identityMeta}>
              <Text style={styles.subtitle} numberOfLines={1}>
                {card.issuer}
              </Text>
              <StatusBadge status={purchase.status} />
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Atualizar compra"
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

        {error ? (
          <InlineFeedback
            variant="error"
            title="Não foi possível atualizar a compra"
            message={`${error} Os dados já carregados continuam disponíveis.`}
            style={styles.feedback}
          />
        ) : null}

        {cardsError ? (
          <InlineFeedback
            variant="warning"
            title="Cartão desatualizado"
            message={`${cardsError} Os dados já carregados continuam disponíveis.`}
            style={styles.feedback}
          />
        ) : null}

        <View style={styles.summaryCard}>
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
              Compromete o limite e as faturas, mas não reduz o saldo da conta.
            </Text>
          )}

          <View style={styles.divider} />

          <View style={styles.detailsBlock}>
            <DetailRow
              icon="calendar"
              label="Data da compra"
              value={formatDateKey(purchase.purchaseDate)}
            />
            <DetailRow
              icon="purchase"
              label="Parcelamento"
              value={formatInstallmentCount(purchase.installmentCount)}
            />
            <DetailRow
              icon="calendar"
              label="Registrada em"
              value={formatTimestamp(purchase.createdAt)}
            />
          </View>
        </View>

        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Compra no cartão de crédito</Text>
          <Text style={styles.noticeText}>
            Esta compra pertence ao domínio de cartões de crédito. Ela não é
            uma despesa em Transações e não altera o saldo de nenhuma conta; o
            saldo só é reduzido no pagamento da fatura. A distribuição das
            parcelas é calculada pelo backend.
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Parcelas e faturas</Text>
          <Text style={styles.sectionCaption}>
            {installments.length}{' '}
            {installments.length === 1 ? 'parcela' : 'parcelas'}
          </Text>
        </View>

        {loading && installments.length === 0 ? (
          <View style={styles.stateCard}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.stateTitle}>Carregando parcelas...</Text>
          </View>
        ) : installments.length === 0 ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateDescription}>
              Esta compra não possui parcelas retornadas pela API.
            </Text>
          </View>
        ) : (
          <View style={styles.installmentsCard}>
            {installments.map((installment, index) => {
              const invoice = invoicesById.get(installment.invoiceId);

              return (
                <Pressable
                  key={installment.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Ver fatura da parcela ${installment.number}`}
                  onPress={() => openInvoice(installment.invoiceId)}
                  style={({ pressed }) => [
                    styles.installmentRow,
                    index !== installments.length - 1 && styles.rowDivider,
                    pressed && styles.rowPressed,
                  ]}
                >
                  <View style={styles.installmentInfo}>
                    <Text style={styles.installmentPosition}>
                      {formatInstallmentPosition(
                        installment.number,
                        purchase.installmentCount,
                      )}
                    </Text>
                    <Text style={styles.installmentInvoice} numberOfLines={1}>
                      {invoice
                        ? `Fatura de ${formatMonthYear(invoice.cycleStart)}`
                        : 'Ver fatura'}
                      {invoice
                        ? ` · vence em ${formatDateKey(invoice.dueDate)}`
                        : ''}
                    </Text>
                  </View>

                  <View style={styles.installmentRight}>
                    <Text
                      style={[
                        styles.installmentAmount,
                        isCancelled && styles.cancelled,
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {maskMoney(formatCurrency(installment.amount), hidden)}
                    </Text>
                    <Icon
                      name="chevron"
                      size={14}
                      color={colors.secondary}
                    />
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Cancelamento</Text>
        </View>

        {isCancelled ? (
          <View style={styles.cancelledCard}>
            <View style={styles.cancelledIcon}>
              <Icon name="cancel" size={20} color={colors.danger} />
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
            <Text style={styles.cancelTitle}>Cancelar esta compra</Text>
            <Text style={styles.cancelDescription}>
              O cancelamento remove as parcelas das faturas e libera o limite
              comprometido. Só é permitido enquanto todas as faturas da compra
              estiverem abertas e sem pagamentos. O histórico da compra é
              preservado como cancelada.
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancelar compra"
              onPress={() => {
                clearCancelError();
                setConfirmOpen(true);
              }}
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.pressed,
              ]}
            >
              <Icon name="cancel" size={16} color={colors.danger} />
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
    </SafeAreaView>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: IconKey;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailLabelGroup}>
        <Icon name={icon} size={13} color={colors.secondary} />
        <Text style={styles.detailLabel}>{label}</Text>
      </View>
      <Text style={styles.detailValue} numberOfLines={2}>
        {value}
      </Text>
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
    gap: 12,
    padding: 18,
    borderRadius: mobileRadius.large,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  summaryLabel: {
    color: colors.secondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontFamily: mobileFont,
  },
  totalValue: {
    color: colors.primary,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.8,
    fontVariant: ['tabular-nums'],
    fontFamily: mobileFont,
  },
  totalValueCancelled: {
    color: colors.secondary,
    textDecorationLine: 'line-through',
  },
  summaryHint: {
    color: colors.secondary,
    fontSize: 11,
    lineHeight: 17,
    fontFamily: mobileFont,
  },
  cancelledHint: {
    color: colors.danger,
    fontSize: 11,
    lineHeight: 17,
    fontFamily: mobileFont,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
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
  notice: {
    marginTop: 14,
    padding: 14,
    borderRadius: mobileRadius.large,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  noticeTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: mobileFont,
  },
  noticeText: {
    marginTop: 5,
    color: colors.secondary,
    fontSize: 11,
    lineHeight: 17,
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
    color: colors.secondary,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    fontFamily: mobileFont,
  },
  installmentsCard: {
    marginTop: 12,
    paddingHorizontal: 15,
    borderRadius: mobileRadius.large,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  installmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 14,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowPressed: {
    opacity: 0.7,
  },
  installmentInfo: {
    flex: 1,
    minWidth: 0,
  },
  installmentPosition: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: mobileFont,
  },
  installmentInvoice: {
    marginTop: 3,
    color: colors.secondary,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    fontFamily: mobileFont,
  },
  installmentRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '45%',
  },
  installmentAmount: {
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
  cancelCard: {
    marginTop: 12,
    padding: 16,
    borderRadius: mobileRadius.large,
    borderWidth: 1,
    borderColor: colors.dangerLight,
    backgroundColor: colors.surface,
  },
  cancelTitle: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: mobileFont,
  },
  cancelDescription: {
    marginTop: 5,
    color: colors.secondary,
    fontSize: 11,
    lineHeight: 17,
    fontFamily: mobileFont,
  },
  cancelButton: {
    marginTop: 14,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.dangerLight,
  },
  cancelButtonText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: mobileFont,
  },
  cancelledCard: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: mobileRadius.large,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cancelledIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dangerLight,
  },
  cancelledBody: {
    flex: 1,
    minWidth: 0,
  },
  cancelledTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: mobileFont,
  },
  cancelledDescription: {
    marginTop: 5,
    color: colors.secondary,
    fontSize: 11,
    lineHeight: 17,
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

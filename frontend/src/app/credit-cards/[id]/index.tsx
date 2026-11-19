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

import { CreditCardUsageBar } from '@/components/credit-cards/credit-card-usage-bar';
import { MobileCreditCardPurchaseFormModal } from '@/components/credit-cards/mobile-credit-card-purchase-form-modal';
import { DesktopCreditCardDetails } from '@/components/desktop/credit-cards/desktop-credit-card-details';
import { InlineFeedback } from '@/components/feedback/inline-feedback';
import {
  mobileColors,
  mobileFont,
  mobileRadius,
  mobileSpacing,
  mobileTypography,
} from '@/constants/mobile-theme';
import { useCreditCardDetails } from '@/hooks/use-credit-card-details';
import { usePrivacy } from '@/contexts/privacy-context';
import { useIsDesktopLayout } from '@/hooks/use-is-desktop-layout';
import type { CreditCardInvoice } from '@/services/credit-card-invoices-api';
import type { CreditCardPurchase } from '@/services/credit-card-purchases-api';
import {
  CARD_STATUS_LABELS,
  INVOICE_STATUS_LABELS,
  PURCHASE_STATUS_LABELS,
  formatDateKey,
  formatInstallmentCount,
  formatInvoiceCycle,
  formatMonthYear,
  getCommittedLimit,
  getInvoiceHighlight,
  getUsageRatio,
  isInvoiceOverdue,
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
  warning: '#A36A1F',
  warningLight: '#FBF3E2',
};

const BACK_ICON = {
  ios: 'chevron.left',
  android: 'arrow_back',
  web: 'arrow_back',
} satisfies SymbolViewProps['name'];

const REFRESH_ICON = {
  ios: 'arrow.clockwise',
  android: 'refresh',
  web: 'refresh',
} satisfies SymbolViewProps['name'];

const INVOICE_ICON = {
  ios: 'doc.text',
  android: 'receipt_long',
  web: 'receipt_long',
} satisfies SymbolViewProps['name'];

const PURCHASE_ICON = {
  ios: 'bag',
  android: 'shopping_bag',
  web: 'shopping_bag',
} satisfies SymbolViewProps['name'];

const PLUS_ICON = {
  ios: 'plus',
  android: 'add',
  web: 'add',
} satisfies SymbolViewProps['name'];

const CHEVRON_ICON = {
  ios: 'chevron.right',
  android: 'chevron_right',
  web: 'chevron_right',
} satisfies SymbolViewProps['name'];

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

const PURCHASE_TONES: Record<
  CreditCardPurchase['status'],
  BadgeTone
> = {
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

export default function CreditCardDetailsScreen() {
  const isDesktop = useIsDesktopLayout();

  if (isDesktop) {
    return <DesktopCreditCardDetails />;
  }

  return <CreditCardDetailsMobileScreen />;
}

function CreditCardDetailsMobileScreen() {
  const router = useRouter();
  const { hidden } = usePrivacy();
  const { id } = useLocalSearchParams<{ id: string }>();

  const {
    card,
    invoices,
    highlightedInvoice,
    purchases,
    categoriesById,
    loading,
    error,
    invoicesError,
    purchasesLoading,
    purchasesError,
    refreshing,
    hasLoadedOnce,
    refresh,
    reloadPurchases,
  } = useCreditCardDetails(id);

  const [purchaseFormOpen, setPurchaseFormOpen] = useState(false);

  function goBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/credit-cards');
  }

  function openInvoice(invoice: CreditCardInvoice) {
    router.push({
      pathname: '/credit-cards/[id]/invoices/[invoiceId]',
      params: { id: invoice.cardId, invoiceId: invoice.id },
    });
  }

  function openPurchase(purchase: CreditCardPurchase) {
    router.push({
      pathname: '/credit-cards/[id]/purchases/[purchaseId]',
      params: { id: purchase.cardId, purchaseId: purchase.id },
    });
  }

  if (!card) {
    const isInitialLoading = loading || !hasLoadedOnce;

    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />

        <View style={styles.centeredContent}>
          {isInitialLoading ? (
            <>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Carregando cartão...</Text>
            </>
          ) : (
            <>
              <Text style={styles.notFoundTitle}>
                {error
                  ? 'Não foi possível carregar o cartão'
                  : 'Cartão não encontrado'}
              </Text>
              <Text style={styles.notFoundDescription}>
                {error ??
                  'Esse cartão pode ter sido removido ou não está mais disponível.'}
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

              {error ? (
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

  const isActive = card.status === 'ACTIVE';
  const usageRatio = getUsageRatio(card);

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
            accessibilityLabel="Voltar"
            onPress={goBack}
            style={({ pressed }) => [
              styles.iconButton,
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
            <Text style={styles.eyebrow}>finora / CARTÕES</Text>
            <Text style={styles.title} numberOfLines={2}>
              {card.name}
            </Text>

            <View style={styles.identityMeta}>
              <Text style={styles.subtitle} numberOfLines={1}>
                {card.issuer}
              </Text>
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
                  {CARD_STATUS_LABELS[card.status]}
                </Text>
              </View>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Atualizar dados do cartão"
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
              <SymbolView
                name={REFRESH_ICON}
                size={19}
                tintColor={colors.primary}
              />
            )}
          </Pressable>
        </View>

        {error ? (
          <InlineFeedback
            variant="error"
            title="Não foi possível atualizar os dados do cartão"
            message={error}
            style={styles.feedback}
          />
        ) : null}

        {invoicesError && !error ? (
          <InlineFeedback
            variant="warning"
            title="Faturas desatualizadas"
            message={`${invoicesError} Os dados já carregados continuam disponíveis.`}
            style={styles.feedback}
          />
        ) : null}

        <View style={styles.limitsCard}>
          <View style={styles.limitsHeader}>
            <Text style={styles.limitsTitle}>Limites do cartão</Text>
            <Text style={styles.limitsHint}>Valores do backend</Text>
          </View>

          <View style={styles.limitValues}>
            <View style={styles.limitBlock}>
              <Text style={styles.limitLabel}>Limite total</Text>
              <Text
                style={styles.limitValue}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {maskMoney(formatCurrency(card.creditLimit), hidden)}
              </Text>
            </View>

            <View style={styles.limitBlock}>
              <Text style={styles.limitLabel}>Comprometido</Text>
              <Text
                style={styles.limitValueMuted}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {maskMoney(formatCurrency(getCommittedLimit(card)), hidden)}
              </Text>
            </View>
          </View>

          <View style={styles.limitBlock}>
            <Text style={styles.limitLabel}>Limite disponível</Text>
            <Text
              style={[styles.limitValue, styles.limitValueAvailable]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {maskMoney(formatCurrency(card.availableLimit), hidden)}
            </Text>
          </View>

          <View style={styles.usageBlock}>
            <View style={styles.usageHeader}>
              <Text style={styles.usageLabel}>Uso do limite</Text>
              <Text style={styles.usagePercentage}>
                {Math.round(usageRatio * 100)}%
              </Text>
            </View>
            <CreditCardUsageBar ratio={usageRatio} />
          </View>

          <View style={styles.divider} />

          <View style={styles.scheduleRow}>
            <View style={styles.scheduleChip}>
              <Text style={styles.scheduleChipText}>
                Fecha dia {card.closingDay}
              </Text>
            </View>
            <View style={styles.scheduleChip}>
              <Text style={styles.scheduleChipText}>
                Vence dia {card.dueDay}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Faturas</Text>
          <Text style={styles.sectionCaption}>
            {invoices.length} {invoices.length === 1 ? 'fatura' : 'faturas'}
          </Text>
        </View>

        <Text style={styles.sectionHint}>Da mais antiga para a mais recente.</Text>

        {loading && invoices.length === 0 ? (
          <View style={styles.stateCard}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.stateTitle}>Carregando faturas...</Text>
          </View>
        ) : invoices.length === 0 ? (
          <View style={styles.stateCard}>
            <View style={styles.emptyIcon}>
              <SymbolView
                name={INVOICE_ICON}
                size={24}
                tintColor={colors.primary}
              />
            </View>
            <Text style={styles.stateTitle}>Nenhuma fatura registrada</Text>
            <Text style={styles.stateDescription}>
              As faturas aparecem aqui quando o backend gerar os ciclos do
              cartão.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {invoices.map((invoice) => (
              <InvoiceItem
                key={invoice.id}
                invoice={invoice}
                highlighted={highlightedInvoice?.id === invoice.id}
                hidden={hidden}
                onOpen={() => openInvoice(invoice)}
              />
            ))}
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Compras</Text>
          <Text style={styles.sectionCaption}>
            {purchases.length} {purchases.length === 1 ? 'compra' : 'compras'}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Registrar nova compra"
          accessibilityState={{ disabled: !isActive }}
          disabled={!isActive}
          onPress={() => setPurchaseFormOpen(true)}
          style={({ pressed }) => [
            styles.newPurchaseButton,
            pressed && isActive && styles.pressed,
            !isActive && styles.newPurchaseButtonDisabled,
          ]}
        >
          <SymbolView
            name={PLUS_ICON}
            size={16}
            tintColor={isActive ? '#FFFFFF' : colors.secondary}
          />
          <Text
            style={[
              styles.newPurchaseButtonText,
              !isActive && styles.newPurchaseButtonTextDisabled,
            ]}
          >
            Nova compra
          </Text>
        </Pressable>

        {!isActive ? (
          <Text style={styles.inactiveHint}>
            Reative o cartão para registrar novas compras.
          </Text>
        ) : null}

        {purchasesError ? (
          <View style={styles.purchasesError}>
            <InlineFeedback
              variant="error"
              title="Não foi possível carregar as compras"
              message={purchasesError}
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

        {purchasesLoading && purchases.length === 0 ? (
          <View style={styles.stateCard}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.stateTitle}>Carregando compras...</Text>
          </View>
        ) : purchases.length === 0 ? (
          <View style={styles.stateCard}>
            <View style={styles.emptyIcon}>
              <SymbolView
                name={PURCHASE_ICON}
                size={24}
                tintColor={colors.primary}
              />
            </View>
            <Text style={styles.stateTitle}>Nenhuma compra registrada</Text>
            <Text style={styles.stateDescription}>
              As compras feitas neste cartão aparecerão aqui.
            </Text>
          </View>
        ) : (
          <View style={styles.purchasesCard}>
            {purchases.map((purchase, index) => (
              <PurchaseItem
                key={purchase.id}
                purchase={purchase}
                category={getPurchaseCategory(purchase, categoriesById)}
                hidden={hidden}
                last={index === purchases.length - 1}
                onOpen={() => openPurchase(purchase)}
              />
            ))}
          </View>
        )}

        <Text style={styles.disclaimer}>
          Compras no cartão não reduzem o saldo da conta; o saldo é reduzido
          apenas no pagamento da fatura. Dados carregados da API da Finora.
        </Text>

        {purchaseFormOpen ? (
          <MobileCreditCardPurchaseFormModal
            card={card}
            onClose={() => setPurchaseFormOpen(false)}
            onCreated={reloadPurchases}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function InvoiceItem({
  invoice,
  highlighted,
  hidden,
  onOpen,
}: {
  invoice: CreditCardInvoice;
  highlighted: boolean;
  hidden: boolean;
  onOpen: () => void;
}) {
  const overdue = isInvoiceOverdue(invoice);
  const highlight = highlighted ? getInvoiceHighlight(invoice) : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ver detalhes da fatura de ${formatMonthYear(invoice.cycleStart)}`}
      onPress={onOpen}
      style={({ pressed }) => [
        styles.invoiceCard,
        highlighted && styles.invoiceCardHighlighted,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.invoiceTop}>
        <View style={styles.invoiceIdentity}>
          <Text style={styles.invoiceCycle}>
            {formatInvoiceCycle(invoice)}
          </Text>
          <Text style={styles.invoiceMonth}>
            {formatMonthYear(invoice.cycleStart)}
          </Text>
        </View>

        <View style={styles.invoiceTopRight}>
          <ModuleBadge
            label={INVOICE_STATUS_LABELS[invoice.status]}
            tone={INVOICE_TONES[invoice.status]}
          />
          <SymbolView
            name={CHEVRON_ICON}
            size={15}
            tintColor={colors.secondary}
          />
        </View>
      </View>

      {(highlight || overdue) && (
        <View style={styles.invoiceBadges}>
          {highlight ? (
            <View style={styles.highlightBadge}>
              <Text style={styles.highlightBadgeText}>{highlight.label}</Text>
            </View>
          ) : null}

          {overdue && highlight?.kind !== 'overdue' ? (
            <View style={styles.overdueBadge}>
              <Text style={styles.overdueText}>Atrasada</Text>
            </View>
          ) : null}
        </View>
      )}

      <View style={styles.invoiceDates}>
        <Text style={styles.invoiceDate}>
          Fecha em {formatDateKey(invoice.closingDate)}
        </Text>
        <Text
          style={[styles.invoiceDate, overdue && styles.overdueDate]}
        >
          Vence em {formatDateKey(invoice.dueDate)}
        </Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.invoiceAmounts}>
        <AmountBlock
          label="Total"
          value={formatCurrency(invoice.totalAmount)}
          hidden={hidden}
        />
        <AmountBlock
          label="Pago"
          value={formatCurrency(invoice.paidAmount)}
          hidden={hidden}
          muted
        />
        <AmountBlock
          label="Restante"
          value={formatCurrency(invoice.remainingAmount)}
          hidden={hidden}
          highlight
          danger={overdue}
        />
      </View>
    </Pressable>
  );
}

function AmountBlock({
  label,
  value,
  hidden,
  muted,
  highlight,
  danger,
}: {
  label: string;
  value: string;
  hidden: boolean;
  muted?: boolean;
  highlight?: boolean;
  danger?: boolean;
}) {
  return (
    <View style={styles.amountBlock}>
      <Text style={styles.amountLabel}>{label}</Text>
      <Text
        style={[
          styles.amountValue,
          muted && styles.amountValueMuted,
          highlight && styles.amountValueHighlight,
          danger && styles.amountValueDanger,
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {maskMoney(value, hidden)}
      </Text>
    </View>
  );
}

function PurchaseItem({
  purchase,
  category,
  hidden,
  last,
  onOpen,
}: {
  purchase: CreditCardPurchase;
  category: string;
  hidden: boolean;
  last: boolean;
  onOpen: () => void;
}) {
  const cancelled = purchase.status === 'CANCELLED';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ver detalhes da compra ${purchase.description}`}
      onPress={onOpen}
      style={({ pressed }) => [
        styles.purchaseRow,
        !last && styles.purchaseRowDivider,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.purchaseInfo}>
        <Text
          style={[styles.purchaseDescription, cancelled && styles.cancelled]}
          numberOfLines={2}
        >
          {purchase.description}
        </Text>
        <Text style={styles.purchaseMeta} numberOfLines={1}>
          {category} · {formatInstallmentCount(purchase.installmentCount)}
        </Text>
        <Text style={styles.purchaseDate}>
          {formatDateKey(purchase.purchaseDate)}
        </Text>
      </View>

      <View style={styles.purchaseRight}>
        <Text
          style={[styles.purchaseAmount, cancelled && styles.cancelled]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {maskMoney(formatCurrency(purchase.totalAmount), hidden)}
        </Text>
        <ModuleBadge
          label={PURCHASE_STATUS_LABELS[purchase.status]}
          tone={PURCHASE_TONES[purchase.status]}
        />
      </View>
    </Pressable>
  );
}

function getPurchaseCategory(
  purchase: CreditCardPurchase,
  categoriesById: Map<string, string>,
) {
  if (!purchase.categoryId) {
    return 'Sem categoria';
  }

  return categoriesById.get(purchase.categoryId) ?? 'Sem categoria';
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
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusBadgeActive: {
    backgroundColor: colors.primaryLight,
  },
  statusBadgeInactive: {
    backgroundColor: colors.surfaceMuted,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: mobileFont,
  },
  statusTextActive: {
    color: colors.primary,
  },
  statusTextInactive: {
    color: colors.secondary,
  },
  feedback: {
    marginBottom: 16,
  },
  limitsCard: {
    gap: 16,
    padding: 18,
    borderRadius: mobileRadius.large,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  limitsHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  limitsTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    fontFamily: mobileFont,
  },
  limitsHint: {
    color: colors.secondary,
    fontSize: 10,
    fontFamily: mobileFont,
  },
  limitValues: {
    flexDirection: 'row',
    gap: 16,
  },
  limitBlock: {
    flex: 1,
    minWidth: 0,
  },
  limitLabel: {
    color: colors.secondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontFamily: mobileFont,
  },
  limitValue: {
    marginTop: 5,
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    fontFamily: mobileFont,
  },
  limitValueMuted: {
    marginTop: 5,
    color: colors.secondary,
    fontSize: 17,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    fontFamily: mobileFont,
  },
  limitValueAvailable: {
    color: colors.primary,
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
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  scheduleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  scheduleChip: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.surfaceMuted,
  },
  scheduleChipText: {
    color: colors.secondary,
    fontSize: 11,
    fontWeight: '600',
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
  sectionHint: {
    marginTop: 4,
    marginBottom: 12,
    color: colors.secondary,
    fontSize: 11,
    fontFamily: mobileFont,
  },
  newPurchaseButton: {
    marginTop: 12,
    marginBottom: 12,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: mobileRadius.medium,
    backgroundColor: colors.primary,
  },
  newPurchaseButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: mobileFont,
  },
  newPurchaseButtonDisabled: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  newPurchaseButtonTextDisabled: {
    color: colors.secondary,
  },
  inactiveHint: {
    marginTop: -4,
    marginBottom: 12,
    color: colors.warning,
    fontSize: 11,
    lineHeight: 16,
    fontFamily: mobileFont,
  },
  list: {
    gap: 12,
  },
  invoiceCard: {
    gap: 11,
    padding: 16,
    borderRadius: mobileRadius.large,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  invoiceCardHighlighted: {
    borderColor: colors.primary,
    backgroundColor: '#F4FAF6',
  },
  invoiceTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  invoiceTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  invoiceIdentity: {
    flexShrink: 1,
    minWidth: 0,
  },
  invoiceCycle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    fontFamily: mobileFont,
  },
  invoiceMonth: {
    marginTop: 3,
    color: colors.secondary,
    fontSize: 11,
    fontFamily: mobileFont,
  },
  invoiceBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  highlightBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.primaryLight,
  },
  highlightBadgeText: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
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
  invoiceDates: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  invoiceDate: {
    color: colors.secondary,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    fontFamily: mobileFont,
  },
  overdueDate: {
    color: colors.danger,
    fontWeight: '700',
  },
  invoiceAmounts: {
    flexDirection: 'row',
    gap: 14,
  },
  amountBlock: {
    flex: 1,
    minWidth: 0,
  },
  amountLabel: {
    color: colors.secondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    fontFamily: mobileFont,
  },
  amountValue: {
    marginTop: 4,
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    fontFamily: mobileFont,
  },
  amountValueMuted: {
    color: colors.secondary,
    fontSize: 13,
    fontWeight: '600',
  },
  amountValueHighlight: {
    color: colors.primary,
  },
  amountValueDanger: {
    color: colors.danger,
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
  purchasesError: {
    gap: 10,
    marginBottom: 12,
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
  purchasesCard: {
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
  purchaseRowDivider: {
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
    fontFamily: mobileFont,
  },
  purchaseDate: {
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

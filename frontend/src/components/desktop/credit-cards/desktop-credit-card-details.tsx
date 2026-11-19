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

import { CreditCardUsageBar } from '@/components/credit-cards/credit-card-usage-bar';
import { DesktopCreditCardPurchaseFormModal } from '@/components/desktop/credit-cards/desktop-credit-card-purchase-form-modal';
import { formatCurrency } from '@/components/desktop/desktop-format';
import {
  desktopColors,
  desktopFont,
  desktopLayout,
  desktopShadows,
} from '@/components/desktop/desktop-theme';
import { InlineFeedback } from '@/components/feedback/inline-feedback';
import { useCreditCardDetails } from '@/hooks/use-credit-card-details';
import { usePrivacy } from '@/contexts/privacy-context';
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

/** Ícones vetoriais da página, na mesma biblioteca do restante do desktop. */
const ICONS = {
  back: { ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' },
  card: { ios: 'creditcard', android: 'credit_card', web: 'credit_card' },
  refresh: { ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' },
  calendar: {
    ios: 'calendar',
    android: 'calendar_month',
    web: 'calendar_month',
  },
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
  plus: { ios: 'plus', android: 'add', web: 'add' },
  empty: { ios: 'tray', android: 'inventory_2', web: 'inventory_2' },
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

const INVOICE_TONES: Record<
  CreditCardInvoice['status'],
  { color: string; background: string }
> = {
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

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: { color: string; background: string };
}) {
  return (
    <View
      style={[styles.badge, { backgroundColor: tone.background }]}
    >
      <Text style={[styles.badgeText, { color: tone.color }]}>{label}</Text>
    </View>
  );
}

function LimitBlock({
  label,
  value,
  hidden,
  highlight,
}: {
  label: string;
  value: number;
  hidden: boolean;
  highlight?: boolean;
}) {
  return (
    <View style={styles.limitBlock}>
      <Text style={styles.limitLabel}>{label}</Text>
      <Text
        style={[styles.limitValue, highlight && styles.limitValueHighlight]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {maskMoney(formatCurrency(value), hidden)}
      </Text>
    </View>
  );
}

export function DesktopCreditCardDetails() {
  const router = useRouter();
  const { hidden } = usePrivacy();
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const cardId = Array.isArray(params.id) ? params.id[0] : params.id;

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
  } = useCreditCardDetails(cardId);

  const [purchaseFormOpen, setPurchaseFormOpen] = useState(false);

  function goBack() {
    router.push('/credit-cards');
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
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar para meus cartões"
          onPress={goBack}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.backButtonPressed,
          ]}
        >
          <Icon name="back" size={16} color={desktopColors.primary} />
          <Text style={styles.backButtonText}>Meus cartões</Text>
        </Pressable>

        <View style={styles.stateCard}>
          {isInitialLoading ? (
            <>
              <ActivityIndicator size="large" color={desktopColors.primary} />
              <Text style={styles.stateText}>Carregando cartão...</Text>
            </>
          ) : (
            <>
              <Text style={styles.stateTitle}>
                {error
                  ? 'Não foi possível carregar o cartão'
                  : 'Cartão não encontrado'}
              </Text>
              <Text style={styles.stateText}>
                {error ??
                  'Esse cartão pode ter sido removido ou não está mais disponível.'}
              </Text>

              {error ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void refresh()}
                  disabled={refreshing}
                  style={({ pressed }) => [
                    styles.stateButton,
                    pressed && styles.stateButtonPressed,
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

  const isActive = card.status === 'ACTIVE';
  const usageRatio = getUsageRatio(card);
  const hasInvoices = invoices.length > 0;
  const hasPurchases = purchases.length > 0;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Voltar para meus cartões"
        onPress={goBack}
        style={({ pressed }) => [
          styles.backButton,
          pressed && styles.backButtonPressed,
        ]}
      >
        <Icon name="back" size={16} color={desktopColors.primary} />
        <Text style={styles.backButtonText}>Meus cartões</Text>
      </Pressable>

      <View style={styles.pageHeader}>
        <View style={styles.identity}>
          <View
            style={[
              styles.cardIcon,
              !isActive && styles.cardIconInactive,
            ]}
          >
            <Icon
              name="card"
              size={22}
              color={isActive ? desktopColors.primary : desktopColors.textMuted}
            />
          </View>

          <View style={styles.identityText}>
            <Text style={styles.title} numberOfLines={1}>
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
                  {CARD_STATUS_LABELS[card.status]}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.headerActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Registrar nova compra"
            accessibilityState={{ disabled: !isActive }}
            disabled={!isActive}
            onPress={() => setPurchaseFormOpen(true)}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && isActive && styles.primaryButtonPressed,
              !isActive && styles.primaryButtonDisabled,
            ]}
          >
            <Icon
              name="plus"
              size={15}
              color={isActive ? '#FFFFFF' : desktopColors.textMuted}
            />
            <Text
              style={[
                styles.primaryButtonText,
                !isActive && styles.primaryButtonTextDisabled,
              ]}
            >
              Nova compra
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Atualizar dados do cartão"
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

      {error ? (
        <InlineFeedback
          variant="error"
          title="Não foi possível atualizar os dados do cartão"
          message={error}
        />
      ) : null}

      {invoicesError && !error ? (
        <InlineFeedback
          variant="warning"
          title="Faturas desatualizadas"
          message={`${invoicesError} Os dados já carregados continuam disponíveis.`}
        />
      ) : null}

      <View style={styles.limitsCard}>
        <View style={styles.limitsHeader}>
          <View style={styles.limitsHeading}>
            <Text style={styles.cardLabel}>Limites do cartão</Text>
            <Text style={styles.limitsHint}>
              Valores calculados e enviados pelo backend.
            </Text>
          </View>

          <View style={styles.scheduleRow}>
            <View style={styles.scheduleItem}>
              <Icon
                name="calendar"
                size={13}
                color={desktopColors.textMuted}
              />
              <Text style={styles.scheduleText}>
                Fecha dia {card.closingDay}
              </Text>
            </View>
            <View style={styles.scheduleItem}>
              <Icon
                name="calendar"
                size={13}
                color={desktopColors.textMuted}
              />
              <Text style={styles.scheduleText}>
                Vence dia {card.dueDay}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.limitsGrid}>
          <LimitBlock
            label="Limite total"
            value={card.creditLimit}
            hidden={hidden}
          />
          <LimitBlock
            label="Limite comprometido"
            value={getCommittedLimit(card)}
            hidden={hidden}
          />
          <LimitBlock
            label="Limite disponível"
            value={card.availableLimit}
            hidden={hidden}
            highlight
          />
        </View>

        <View style={styles.usageBlock}>
          <View style={styles.usageHeader}>
            <Text style={styles.usageLabel}>Uso do limite</Text>
            <Text style={styles.usagePercentage}>
              {Math.round(usageRatio * 100)}%
            </Text>
          </View>
          <CreditCardUsageBar ratio={usageRatio} thickness={8} />
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Faturas</Text>
        <Text style={styles.sectionHint}>
          {invoices.length}{' '}
          {invoices.length === 1 ? 'fatura' : 'faturas'} em ordem cronológica
        </Text>
      </View>

      <View style={styles.tableCard}>
        <View style={styles.tableHeader}>
          <Text style={[styles.headCell, styles.cycleCell]}>Período</Text>
          <Text style={[styles.headCell, styles.dateCell]}>Fechamento</Text>
          <Text style={[styles.headCell, styles.dateCell]}>Vencimento</Text>
          <Text style={[styles.headCell, styles.amountCell]}>Total</Text>
          <Text style={[styles.headCell, styles.amountCell]}>Pago</Text>
          <Text style={[styles.headCell, styles.amountCell]}>Restante</Text>
          <Text style={[styles.headCell, styles.statusCell]}>Status</Text>
        </View>

        {loading && !hasInvoices ? (
          <View style={styles.tableState}>
            <ActivityIndicator size="large" color={desktopColors.primary} />
            <Text style={styles.stateText}>Carregando faturas...</Text>
          </View>
        ) : !hasInvoices ? (
          <View style={styles.tableState}>
            <View style={styles.emptyIcon}>
              <Icon name="invoice" size={24} color={desktopColors.primary} />
            </View>
            <Text style={styles.stateTitle}>Nenhuma fatura registrada</Text>
            <Text style={styles.stateText}>
              As faturas aparecem aqui quando o backend gerar os ciclos do
              cartão.
            </Text>
          </View>
        ) : (
          invoices.map((invoice, index) => {
            const isHighlighted = highlightedInvoice?.id === invoice.id;
            const highlight = getInvoiceHighlight(invoice);
            const overdue = isInvoiceOverdue(invoice);
            const tone = INVOICE_TONES[invoice.status];

            return (
              <Pressable
                key={invoice.id}
                accessibilityRole="button"
                accessibilityLabel={`Ver detalhes da fatura de ${formatMonthYear(invoice.cycleStart)}`}
                onPress={() => openInvoice(invoice)}
                style={({ pressed }) => [
                  styles.row,
                  isHighlighted && styles.highlightedRow,
                  index === invoices.length - 1 && styles.rowLast,
                  pressed && styles.rowPressed,
                ]}
              >
                <View style={styles.cycleCell}>
                  <Text style={styles.cycleText} numberOfLines={1}>
                    {formatInvoiceCycle(invoice)}
                  </Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {formatMonthYear(invoice.cycleStart)}
                  </Text>
                  {isHighlighted && highlight ? (
                    <View style={styles.highlightBadge}>
                      <Text style={styles.highlightBadgeText}>
                        {highlight.label}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.dateCell}>
                  <Text style={styles.dateText}>
                    {formatDateKey(invoice.closingDate)}
                  </Text>
                </View>

                <View style={styles.dateCell}>
                  <Text style={styles.dateText}>
                    {formatDateKey(invoice.dueDate)}
                  </Text>
                  {overdue ? (
                    <View style={styles.overdueBadge}>
                      <Text style={styles.overdueText}>Atrasada</Text>
                    </View>
                  ) : null}
                </View>

                <Text style={[styles.amountText, styles.amountCell]}>
                  {maskMoney(formatCurrency(invoice.totalAmount), hidden)}
                </Text>
                <Text style={[styles.amountTextMuted, styles.amountCell]}>
                  {maskMoney(formatCurrency(invoice.paidAmount), hidden)}
                </Text>
                <Text
                  style={[
                    styles.amountText,
                    styles.amountCell,
                    overdue && styles.overdueAmount,
                  ]}
                >
                  {maskMoney(formatCurrency(invoice.remainingAmount), hidden)}
                </Text>

                <View style={styles.statusCell}>
                  <StatusBadge
                    label={INVOICE_STATUS_LABELS[invoice.status]}
                    tone={tone}
                  />
                </View>
              </Pressable>
            );
          })
        )}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Compras</Text>
        <Text style={styles.sectionHint}>
          {purchases.length}{' '}
          {purchases.length === 1 ? 'compra' : 'compras'} registradas
        </Text>
      </View>

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
          <Text style={[styles.headCell, styles.descriptionCell]}>
            Descrição
          </Text>
          <Text style={[styles.headCell, styles.dateCell]}>Data</Text>
          <Text style={[styles.headCell, styles.categoryCell]}>
            Categoria
          </Text>
          <Text style={[styles.headCell, styles.installmentsCell]}>
            Parcelas
          </Text>
          <Text style={[styles.headCell, styles.statusCell]}>Status</Text>
          <Text style={[styles.headCell, styles.amountCell]}>Valor</Text>
        </View>

        {purchasesLoading && !hasPurchases ? (
          <View style={styles.tableState}>
            <ActivityIndicator size="large" color={desktopColors.primary} />
            <Text style={styles.stateText}>Carregando compras...</Text>
          </View>
        ) : !hasPurchases ? (
          <View style={styles.tableState}>
            <View style={styles.emptyIcon}>
              <Icon name="purchase" size={24} color={desktopColors.primary} />
            </View>
            <Text style={styles.stateTitle}>Nenhuma compra registrada</Text>
            <Text style={styles.stateText}>
              As compras feitas neste cartão aparecerão aqui.
            </Text>
          </View>
        ) : (
          purchases.map((purchase, index) => {
            const cancelled = purchase.status === 'CANCELLED';

            return (
              <Pressable
                key={purchase.id}
                accessibilityRole="button"
                accessibilityLabel={`Ver detalhes da compra ${purchase.description}`}
                onPress={() => openPurchase(purchase)}
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

                <View style={styles.dateCell}>
                  <Text style={styles.dateText}>
                    {formatDateKey(purchase.purchaseDate)}
                  </Text>
                </View>

                <Text style={[styles.categoryText, styles.categoryCell]} numberOfLines={1}>
                  {getPurchaseCategory(purchase, categoriesById)}
                </Text>

                <Text style={[styles.installmentsText, styles.installmentsCell]}>
                  {formatInstallmentCount(purchase.installmentCount)}
                </Text>

                <View style={styles.statusCell}>
                  <StatusBadge
                    label={PURCHASE_STATUS_LABELS[purchase.status]}
                    tone={
                      cancelled
                        ? {
                            color: desktopColors.expense,
                            background: desktopColors.expenseSoft,
                          }
                        : {
                            color: desktopColors.income,
                            background: desktopColors.incomeSoft,
                          }
                    }
                  />
                </View>

                <Text
                  style={[
                    styles.amountText,
                    styles.amountCell,
                    cancelled && styles.cancelledText,
                  ]}
                >
                  {maskMoney(formatCurrency(purchase.totalAmount), hidden)}
                </Text>
              </Pressable>
            );
          })
        )}
      </View>

      <Text style={styles.disclaimer}>
        Compras no cartão não reduzem o saldo da conta; o saldo é reduzido
        apenas no pagamento da fatura. Dados carregados da API da Finora.
      </Text>

      {purchaseFormOpen ? (
        <DesktopCreditCardPurchaseFormModal
          card={card}
          onClose={() => setPurchaseFormOpen(false)}
          onCreated={reloadPurchases}
        />
      ) : null}
    </ScrollView>
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
    minWidth: 260,
  },
  cardIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: desktopColors.primarySoft,
  },
  cardIconInactive: {
    backgroundColor: desktopColors.surfaceMuted,
  },
  identityText: {
    flexShrink: 1,
    minWidth: 0,
  },
  title: {
    color: desktopColors.text,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.8,
    fontFamily: desktopFont,
  },
  identityMeta: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  subtitle: {
    color: desktopColors.textSecondary,
    fontSize: 12,
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
    backgroundColor: desktopColors.surfaceMuted,
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
  primaryButtonDisabled: {
    backgroundColor: desktopColors.surfaceMuted,
    borderWidth: 1,
    borderColor: desktopColors.border,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: desktopFont,
  },
  primaryButtonTextDisabled: {
    color: desktopColors.textMuted,
  },
  inactiveHint: {
    marginTop: -8,
    color: desktopColors.warning,
    fontSize: 11,
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
  limitsCard: {
    gap: 18,
    padding: 22,
    borderRadius: desktopLayout.radius,
    borderWidth: 1,
    borderColor: desktopColors.border,
    backgroundColor: desktopColors.surface,
    ...desktopShadows.card,
  },
  limitsHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  limitsHeading: {
    flexShrink: 1,
    minWidth: 0,
  },
  cardLabel: {
    color: desktopColors.text,
    fontSize: 14,
    fontWeight: '800',
    fontFamily: desktopFont,
  },
  limitsHint: {
    marginTop: 3,
    color: desktopColors.textMuted,
    fontSize: 11,
    fontFamily: desktopFont,
  },
  scheduleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
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
  limitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  limitBlock: {
    flexGrow: 1,
    flexBasis: 180,
    minWidth: 0,
    gap: 5,
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
    color: desktopColors.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
    fontFamily: desktopFont,
  },
  limitValueHighlight: {
    color: desktopColors.primary,
  },
  usageBlock: {
    gap: 8,
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
  highlightedRow: {
    backgroundColor: desktopColors.primarySoft,
  },
  rowPressed: {
    backgroundColor: desktopColors.surfaceMuted,
  },
  cycleCell: {
    flexGrow: 2,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
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
  categoryCell: {
    width: 128,
    flexShrink: 0,
  },
  installmentsCell: {
    width: 92,
    flexShrink: 0,
  },
  amountCell: {
    width: 112,
    flexShrink: 0,
    textAlign: 'right',
  },
  statusCell: {
    width: 132,
    flexShrink: 0,
    alignItems: 'flex-start',
  },
  cycleText: {
    color: desktopColors.text,
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    fontFamily: desktopFont,
  },
  rowMeta: {
    marginTop: 2,
    color: desktopColors.textMuted,
    fontSize: 10,
    fontFamily: desktopFont,
  },
  highlightBadge: {
    alignSelf: 'flex-start',
    marginTop: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: desktopColors.surface,
  },
  highlightBadgeText: {
    color: desktopColors.primary,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    fontFamily: desktopFont,
  },
  dateText: {
    color: desktopColors.text,
    fontSize: 12,
    fontWeight: '600',
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
  amountTextMuted: {
    color: desktopColors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    fontFamily: desktopFont,
  },
  overdueAmount: {
    color: desktopColors.expense,
  },
  descriptionText: {
    color: desktopColors.text,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: desktopFont,
  },
  categoryText: {
    color: desktopColors.textSecondary,
    fontSize: 12,
    fontFamily: desktopFont,
  },
  installmentsText: {
    color: desktopColors.textSecondary,
    fontSize: 11,
    fontFamily: desktopFont,
  },
  cancelledText: {
    color: desktopColors.textMuted,
    textDecorationLine: 'line-through',
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
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
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
  purchasesError: {
    gap: 10,
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
    paddingVertical: 46,
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
    maxWidth: 420,
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

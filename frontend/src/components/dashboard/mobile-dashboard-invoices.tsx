import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { InlineFeedback } from '@/components/feedback/inline-feedback';
import {
  mobileColors,
  mobileFont,
  mobileRadius,
} from '@/constants/mobile-theme';
import { usePrivacy } from '@/contexts/privacy-context';
import { useDashboardCreditCards } from '@/hooks/use-dashboard-credit-cards';
import type { CreditCardInvoice } from '@/services/credit-card-invoices-api';
import {
  INVOICE_STATUS_LABELS,
  formatDateKey,
  isInvoiceOverdue,
} from '@/utils/credit-cards';
import { maskMoney } from '@/utils/privacy';

const colors = {
  surface: mobileColors.surface,
  surfaceMuted: mobileColors.surfaceMuted,
  primary: mobileColors.primary,
  primarySoft: mobileColors.primarySoft,
  text: mobileColors.text,
  secondary: mobileColors.textSecondary,
  muted: mobileColors.textMuted,
  border: mobileColors.border,
  expense: mobileColors.expense,
};

const CARD_ICON = {
  ios: 'creditcard',
  android: 'credit_card',
  web: 'credit_card',
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

function pluralize(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

/**
 * Faturas de cartão do Dashboard mobile.
 *
 * Os valores vêm do `CreditCardsProvider`: apenas faturas pendentes de cartões
 * ativos, exibindo o `remainingAmount` informado pelo backend. Limite
 * disponível não é apresentado nesta seção.
 */
export function MobileDashboardInvoices() {
  const router = useRouter();
  const { hidden } = usePrivacy();
  const {
    visibleEntries,
    hiddenInvoiceCount,
    pendingTotal,
    pendingCount,
    nextDueDate,
    nextDueOverdue,
    loading,
    error,
    invoicesError,
    refresh,
  } = useDashboardCreditCards();

  function openInvoice(invoice: CreditCardInvoice) {
    router.push({
      pathname: '/credit-cards/[id]/invoices/[invoiceId]',
      params: { id: invoice.cardId, invoiceId: invoice.id },
    });
  }

  const isInitialLoading = loading && visibleEntries.length === 0;
  const isRefreshing = loading && visibleEntries.length > 0;
  const isEmpty = pendingCount === 0;

  return (
    <View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Faturas de cartão</Text>

        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Ver todas as faturas de cartão"
          onPress={() => router.navigate('/credit-cards')}
        >
          <Text style={styles.sectionLink}>Ver todas</Text>
        </Pressable>
      </View>

      {error ? (
        <View style={styles.feedbackBlock}>
          <InlineFeedback
            variant="error"
            title="Não foi possível atualizar as faturas"
            message={error}
          />

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isRefreshing }}
            disabled={isRefreshing}
            onPress={() => void refresh().catch(() => {})}
            style={({ pressed }) => [
              styles.retryButton,
              pressed && styles.pressed,
              isRefreshing && styles.disabled,
            ]}
          >
            <Text style={styles.retryButtonText}>
              {isRefreshing ? 'Atualizando...' : 'Tentar novamente'}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {invoicesError && !error ? (
        <InlineFeedback
          variant="warning"
          title="Faturas desatualizadas"
          message={invoicesError}
          style={styles.feedbackBlock}
        />
      ) : null}

      {isInitialLoading ? (
        <View style={styles.stateCard}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.stateText}>Carregando faturas...</Text>
        </View>
      ) : isEmpty && !error ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Nenhuma fatura pendente</Text>
          <Text style={styles.emptyText}>
            As faturas em aberto dos cartões ativos aparecem aqui.
          </Text>
        </View>
      ) : !isEmpty ? (
        <View style={styles.panel}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryMain}>
              <Text style={styles.summaryLabel}>Total restante</Text>
              <Text
                style={styles.summaryValue}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {maskMoney(formatCurrency(pendingTotal), hidden)}
              </Text>
              <Text style={styles.summaryHint} numberOfLines={1}>
                {pluralize(
                  pendingCount,
                  'fatura pendente',
                  'faturas pendentes',
                )}
              </Text>
            </View>

            <View style={styles.summaryMeta}>
              <Text style={styles.summaryLabel}>Próximo vencimento</Text>
              <Text
                style={[
                  styles.summaryDue,
                  nextDueOverdue && styles.summaryDueOverdue,
                ]}
                numberOfLines={1}
              >
                {nextDueDate ? formatDateKey(nextDueDate) : '—'}
              </Text>
              <Text style={styles.summaryHint} numberOfLines={1}>
                {nextDueOverdue ? 'Vencida' : 'A vencer'}
              </Text>
            </View>
          </View>

          <View style={styles.list}>
            {visibleEntries.map((entry, index) => {
              const overdue = isInvoiceOverdue(entry.invoice);

              return (
                <Pressable
                  key={entry.invoice.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Ver fatura de ${
                    entry.card.name
                  }, vencimento em ${formatDateKey(
                    entry.invoice.dueDate,
                  )}, restante ${formatCurrency(entry.invoice.remainingAmount)}`}
                  onPress={() => openInvoice(entry.invoice)}
                  style={({ pressed }) => [
                    styles.invoiceRow,
                    index > 0 && styles.rowDivider,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.cardIcon}>
                    <SymbolView
                      name={CARD_ICON}
                      size={16}
                      tintColor={colors.primary}
                    />
                  </View>

                  <View style={styles.invoiceInfo}>
                    <Text style={styles.cardName} numberOfLines={1}>
                      {entry.card.name}
                    </Text>
                    <Text
                      style={[
                        styles.invoiceMeta,
                        overdue && styles.invoiceMetaOverdue,
                      ]}
                      numberOfLines={1}
                    >
                      {overdue
                        ? `Venceu em ${formatDateKey(entry.invoice.dueDate)}`
                        : `Vence em ${formatDateKey(entry.invoice.dueDate)}`}
                    </Text>
                  </View>

                  <View style={styles.invoiceAmountBlock}>
                    <Text
                      style={styles.invoiceAmount}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                    >
                      {maskMoney(
                        formatCurrency(entry.invoice.remainingAmount),
                        hidden,
                      )}
                    </Text>
                    <View style={styles.invoiceStatusRow}>
                      <Text
                        style={[
                          styles.invoiceStatus,
                          overdue && styles.invoiceStatusOverdue,
                        ]}
                        numberOfLines={1}
                      >
                        {overdue
                          ? 'Vencida'
                          : INVOICE_STATUS_LABELS[entry.invoice.status]}
                      </Text>
                      <SymbolView
                        name={CHEVRON_ICON}
                        size={9}
                        tintColor={colors.muted}
                      />
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {hiddenInvoiceCount > 0 ? (
            <View style={styles.moreRow}>
              <Text style={styles.moreText}>
                {`+ ${pluralize(
                  hiddenInvoiceCount,
                  'fatura pendente',
                  'faturas pendentes',
                )}`}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 26,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    fontFamily: mobileFont,
  },
  sectionLink: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: mobileFont,
  },
  feedbackBlock: {
    marginBottom: 12,
  },
  retryButton: {
    alignSelf: 'flex-start',
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  retryButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: mobileFont,
  },
  stateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: mobileRadius.large,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 22,
  },
  stateText: {
    fontSize: 12,
    color: colors.secondary,
    fontFamily: mobileFont,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: mobileRadius.large,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    fontFamily: mobileFont,
  },
  emptyText: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 18,
    color: colors.secondary,
    fontFamily: mobileFont,
  },
  panel: {
    backgroundColor: colors.surface,
    borderRadius: mobileRadius.large,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.surfaceMuted,
  },
  summaryMain: {
    flexShrink: 1,
    minWidth: 0,
  },
  summaryMeta: {
    flexShrink: 1,
    minWidth: 0,
    alignItems: 'flex-end',
  },
  summaryLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.muted,
    fontFamily: mobileFont,
  },
  summaryValue: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    fontVariant: ['tabular-nums'],
    fontFamily: mobileFont,
  },
  summaryDue: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
    fontFamily: mobileFont,
  },
  summaryDueOverdue: {
    color: colors.expense,
  },
  summaryHint: {
    marginTop: 3,
    fontSize: 10,
    color: colors.secondary,
    fontFamily: mobileFont,
  },
  list: {
    paddingHorizontal: 14,
  },
  invoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cardIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  invoiceInfo: {
    flex: 1,
    minWidth: 0,
  },
  cardName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    fontFamily: mobileFont,
  },
  invoiceMeta: {
    marginTop: 2,
    fontSize: 10,
    color: colors.secondary,
    fontFamily: mobileFont,
  },
  invoiceMetaOverdue: {
    color: colors.expense,
    fontWeight: '600',
  },
  invoiceAmountBlock: {
    alignItems: 'flex-end',
    maxWidth: '46%',
  },
  invoiceAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    fontVariant: ['tabular-nums'],
    fontFamily: mobileFont,
  },
  invoiceStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  invoiceStatus: {
    fontSize: 10,
    color: colors.muted,
    fontFamily: mobileFont,
  },
  invoiceStatusOverdue: {
    color: colors.expense,
    fontWeight: '600',
  },
  moreRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  moreText: {
    fontSize: 10,
    color: colors.muted,
    fontFamily: mobileFont,
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.4,
  },
});

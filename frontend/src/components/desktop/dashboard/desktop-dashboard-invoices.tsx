import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { formatCurrency } from '@/components/desktop/desktop-format';
import {
  desktopColors,
  desktopFont,
  desktopLayout,
  desktopShadows,
} from '@/components/desktop/desktop-theme';
import { InlineFeedback } from '@/components/feedback/inline-feedback';
import { usePrivacy } from '@/contexts/privacy-context';
import { useDashboardCreditCards } from '@/hooks/use-dashboard-credit-cards';
import type { CreditCardInvoice } from '@/services/credit-card-invoices-api';
import {
  INVOICE_STATUS_LABELS,
  formatDateKey,
  isInvoiceOverdue,
} from '@/utils/credit-cards';
import { maskMoney } from '@/utils/privacy';

const ICONS = {
  card: { ios: 'creditcard', android: 'credit_card', web: 'credit_card' },
  chevron: {
    ios: 'chevron.right',
    android: 'chevron_right',
    web: 'chevron_right',
  },
} satisfies Record<string, SymbolViewProps['name']>;

function pluralize(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function InvoiceRow({
  cardName,
  invoice,
  hidden,
  onOpenInvoice,
}: {
  cardName: string;
  invoice: CreditCardInvoice;
  hidden: boolean;
  onOpenInvoice: (invoice: CreditCardInvoice) => void;
}) {
  const overdue = isInvoiceOverdue(invoice);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ver fatura de ${cardName}, vencimento em ${formatDateKey(
        invoice.dueDate,
      )}, restante ${formatCurrency(invoice.remainingAmount)}`}
      onPress={() => onOpenInvoice(invoice)}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.cardCell}>
        <View style={styles.cardBadge}>
          <SymbolView
            name={ICONS.card}
            size={15}
            tintColor={desktopColors.primary}
          />
        </View>

        <View style={styles.cardIdentity}>
          <Text style={styles.cardName} numberOfLines={1}>
            {cardName}
          </Text>
          <Text
            style={[
              styles.invoiceStatus,
              overdue && styles.invoiceStatusOverdue,
            ]}
            numberOfLines={1}
          >
            {overdue
              ? 'Vencida'
              : INVOICE_STATUS_LABELS[invoice.status]}
          </Text>
        </View>
      </View>

      <Text
        style={[styles.dueCell, overdue && styles.dueCellOverdue]}
        numberOfLines={1}
      >
        {formatDateKey(invoice.dueDate)}
      </Text>

      <View style={styles.amountCell}>
        <Text
          style={styles.amountValue}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {maskMoney(formatCurrency(invoice.remainingAmount), hidden)}
        </Text>
        <SymbolView
          name={ICONS.chevron}
          size={10}
          tintColor={desktopColors.textMuted}
        />
      </View>
    </Pressable>
  );
}

/**
 * Faturas de cartão do Dashboard desktop.
 *
 * Reutiliza o `CreditCardsProvider`; o valor exibido é sempre o
 * `remainingAmount` informado pelo backend para faturas pendentes de cartões
 * ativos. Limite disponível não é apresentado nesta seção.
 */
export function DesktopDashboardInvoices() {
  const router = useRouter();
  const { hidden } = usePrivacy();
  const {
    entries,
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

  const isInitialLoading = loading && entries.length === 0;
  const isRefreshing = loading && entries.length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.heading}>
          <Text style={styles.title}>Faturas de cartão</Text>
          <Text style={styles.subtitle}>
            Faturas pendentes dos cartões ativos
          </Text>
        </View>

        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Ver todas as faturas de cartão"
          onPress={() => router.navigate('/credit-cards')}
          style={({ pressed }) => [
            styles.linkButton,
            pressed && styles.linkButtonPressed,
          ]}
        >
          <Text style={styles.linkText}>Ver todas</Text>
          <Text style={styles.linkChevron}>›</Text>
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
              pressed && styles.retryButtonPressed,
              isRefreshing && styles.retryButtonDisabled,
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
        <View style={styles.loadingState}>
          <ActivityIndicator size="small" color={desktopColors.primary} />
          <Text style={styles.loadingText}>Carregando faturas...</Text>
        </View>
      ) : entries.length === 0 && !error ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Nenhuma fatura pendente</Text>
          <Text style={styles.emptyText}>
            As faturas em aberto dos cartões ativos aparecem aqui.
          </Text>
        </View>
      ) : entries.length > 0 ? (
        <>
          <View style={styles.summaryRow}>
            <View style={styles.summaryMain}>
              <Text style={styles.summaryLabel}>Total restante</Text>
              <Text
                style={styles.summaryValue}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {maskMoney(formatCurrency(pendingTotal), hidden)}
              </Text>
            </View>

            <View style={styles.summaryMeta}>
              <Text style={styles.summaryCount} numberOfLines={1}>
                {pluralize(pendingCount, 'fatura pendente', 'faturas pendentes')}
              </Text>
              <Text
                style={[
                  styles.summaryDue,
                  nextDueOverdue && styles.summaryDueOverdue,
                ]}
                numberOfLines={1}
              >
                {nextDueOverdue ? 'Venceu em ' : 'Próximo vencimento em '}
                {nextDueDate ? formatDateKey(nextDueDate) : '—'}
              </Text>
            </View>
          </View>

          <View style={styles.table}>
            <View style={styles.columnHeader}>
              <Text style={[styles.columnLabel, styles.cardCell]}>Cartão</Text>
              <Text
                style={[styles.columnLabel, styles.dueCell]}
              >
                Vencimento
              </Text>
              <Text
                style={[
                  styles.columnLabel,
                  styles.amountHeaderCell,
                ]}
              >
                Restante
              </Text>
            </View>

            {visibleEntries.map((entry) => (
              <InvoiceRow
                key={entry.invoice.id}
                cardName={entry.card.name}
                invoice={entry.invoice}
                hidden={hidden}
                onOpenInvoice={openInvoice}
              />
            ))}
          </View>

          {hiddenInvoiceCount > 0 ? (
            <Text style={styles.hiddenCount}>
              {`+ ${pluralize(
                hiddenInvoiceCount,
                'fatura pendente',
                'faturas pendentes',
              )}`}
            </Text>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: 300,
    padding: 20,
    borderRadius: desktopLayout.radius,
    borderWidth: 1,
    borderColor: desktopColors.border,
    backgroundColor: desktopColors.surface,
    ...desktopShadows.card,
  },
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  heading: {
    flexShrink: 1,
    minWidth: 160,
  },
  title: {
    color: desktopColors.text,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
    fontFamily: desktopFont,
  },
  subtitle: {
    marginTop: 4,
    color: desktopColors.textSecondary,
    fontSize: 11,
    fontFamily: desktopFont,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 2,
  },
  linkButtonPressed: {
    opacity: 0.62,
  },
  linkText: {
    color: desktopColors.primary,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: desktopFont,
  },
  linkChevron: {
    color: desktopColors.primary,
    fontSize: 16,
    lineHeight: 17,
    fontFamily: desktopFont,
  },
  feedbackBlock: {
    marginTop: 14,
  },
  retryButton: {
    alignSelf: 'flex-start',
    marginTop: 10,
    borderWidth: 1,
    borderColor: desktopColors.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  retryButtonPressed: {
    backgroundColor: desktopColors.primarySoft,
  },
  retryButtonDisabled: {
    opacity: 0.4,
  },
  retryButtonText: {
    color: desktopColors.primary,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: desktopFont,
  },
  loadingState: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 20,
  },
  loadingText: {
    color: desktopColors.textSecondary,
    fontSize: 12,
    fontFamily: desktopFont,
  },
  emptyState: {
    marginTop: 14,
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  emptyTitle: {
    color: desktopColors.text,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: desktopFont,
  },
  emptyText: {
    marginTop: 5,
    color: desktopColors.textSecondary,
    fontSize: 11,
    lineHeight: 17,
    fontFamily: desktopFont,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: desktopLayout.radiusSmall,
    backgroundColor: desktopColors.surfaceMuted,
  },
  summaryMain: {
    flexShrink: 1,
    minWidth: 130,
  },
  summaryMeta: {
    flexShrink: 1,
    minWidth: 140,
    alignItems: 'flex-end',
  },
  summaryLabel: {
    color: desktopColors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontFamily: desktopFont,
  },
  summaryValue: {
    marginTop: 4,
    color: desktopColors.text,
    fontSize: 19,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    fontFamily: desktopFont,
  },
  summaryCount: {
    color: desktopColors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
    fontFamily: desktopFont,
  },
  summaryDue: {
    marginTop: 3,
    color: desktopColors.textSecondary,
    fontSize: 10,
    fontFamily: desktopFont,
  },
  summaryDueOverdue: {
    color: desktopColors.expense,
    fontWeight: '600',
  },
  table: {
    marginTop: 14,
  },
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: desktopColors.border,
  },
  columnLabel: {
    color: desktopColors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontFamily: desktopFont,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: desktopColors.border,
    borderRadius: 8,
  },
  rowPressed: {
    backgroundColor: desktopColors.surfaceMuted,
  },
  cardCell: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  cardBadge: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: desktopColors.primarySoft,
  },
  cardIdentity: {
    flex: 1,
    minWidth: 0,
  },
  cardName: {
    color: desktopColors.text,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: desktopFont,
  },
  invoiceStatus: {
    marginTop: 2,
    color: desktopColors.textSecondary,
    fontSize: 10,
    fontFamily: desktopFont,
  },
  invoiceStatusOverdue: {
    color: desktopColors.expense,
    fontWeight: '600',
  },
  dueCell: {
    width: 82,
    color: desktopColors.textSecondary,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    fontFamily: desktopFont,
  },
  dueCellOverdue: {
    color: desktopColors.expense,
    fontWeight: '600',
  },
  amountCell: {
    width: 116,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 5,
  },
  amountHeaderCell: {
    width: 116,
    textAlign: 'right',
  },
  amountValue: {
    color: desktopColors.text,
    fontSize: 12,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    fontFamily: desktopFont,
  },
  hiddenCount: {
    marginTop: 10,
    color: desktopColors.textMuted,
    fontSize: 10,
    fontFamily: desktopFont,
  },
});

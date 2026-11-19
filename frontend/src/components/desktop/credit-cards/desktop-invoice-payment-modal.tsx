import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CurrencyInput } from '@/components/currency-input';
import { formatCurrency } from '@/components/desktop/desktop-format';
import { desktopColors, desktopFont } from '@/components/desktop/desktop-theme';
import {
  DesktopFormActions,
  DesktopFormField,
  DesktopFormModal,
  DesktopFormSelect,
  desktopFormStyles,
} from '@/components/desktop/forms/desktop-form';
import { InlineFeedback } from '@/components/feedback/inline-feedback';
import { usePrivacy } from '@/contexts/privacy-context';
import { useInvoicePaymentForm } from '@/hooks/use-invoice-payment-form';
import type {
  CreditCardInvoice,
  CreditCardPayment,
  CreditCardPaymentResult,
} from '@/services/credit-card-invoices-api';
import { maskMoney } from '@/utils/privacy';

type DesktopInvoicePaymentModalProps = {
  cardId: string;
  cardName: string;
  invoice: CreditCardInvoice;
  onClose: () => void;
  onConfirmed: (result: CreditCardPaymentResult) => void;
  onInvoiceUpdated: (
    invoice: CreditCardInvoice,
    payments: CreditCardPayment[],
  ) => void;
};

/**
 * Formulário desktop de pagamento parcial ou integral de fatura.
 *
 * Compartilha validação e envio com a versão mobile. Nenhum saldo, limite ou
 * valor de parcela é calculado aqui.
 */
export function DesktopInvoicePaymentModal({
  cardId,
  cardName,
  invoice,
  onClose,
  onConfirmed,
  onInvoiceUpdated,
}: DesktopInvoicePaymentModalProps) {
  const { hidden } = usePrivacy();
  const {
    form,
    updateField,
    payFullAmount,
    activeAccounts,
    accountsLoading,
    accountsError,
    saving,
    formError,
    save,
  } = useInvoicePaymentForm({
    cardId,
    invoice,
    onClose,
    onConfirmed,
    onInvoiceUpdated,
  });

  const selectedAccount = activeAccounts.find(
    (account) => account.id === form.accountId,
  );
  const noActiveAccounts = !accountsLoading && activeAccounts.length === 0;

  function closeForm() {
    if (!saving) {
      onClose();
    }
  }

  return (
    <DesktopFormModal
      onClose={closeForm}
      closeDisabled={saving}
      eyebrow="PAGAMENTO DE FATURA"
      title="Pagar fatura"
      description={`Registre o pagamento da fatura de ${cardName}. O valor é debitado da conta bancária escolhida.`}
      maxWidth={560}
      footer={
        <DesktopFormActions
          onCancel={closeForm}
          onSave={() => void save()}
          saveLabel="Pagar fatura"
          saving={saving}
          savingLabel="Pagando..."
          cancelDisabled={saving}
          saveDisabled={noActiveAccounts || accountsLoading}
        />
      }
    >
      <View style={styles.summary}>
        <View style={styles.summaryBlock}>
          <Text style={styles.summaryLabel}>Valor original</Text>
          <Text style={styles.summaryValue} numberOfLines={1}>
            {maskMoney(formatCurrency(invoice.totalAmount), hidden)}
          </Text>
        </View>

        <View style={styles.summaryBlock}>
          <Text style={styles.summaryLabel}>Já pago</Text>
          <Text style={styles.summaryValueMuted} numberOfLines={1}>
            {maskMoney(formatCurrency(invoice.paidAmount), hidden)}
          </Text>
        </View>

        <View style={styles.summaryBlock}>
          <Text style={styles.summaryLabel}>Saldo restante</Text>
          <Text
            style={styles.remainingValue}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {maskMoney(formatCurrency(invoice.remainingAmount), hidden)}
          </Text>
        </View>
      </View>

      <View style={desktopFormStyles.grid}>
        <DesktopFormField
          label="Valor do pagamento"
          hint="O valor deve ser maior que zero e não pode exceder o saldo restante."
          grid
        >
          <CurrencyInput
            accessibilityLabel="Valor do pagamento em reais"
            style={desktopFormStyles.input}
            value={form.amount}
            onChangeValue={(value) => updateField('amount', value)}
            returnKeyType="next"
            editable={!saving}
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Pagar integralmente o saldo restante"
            disabled={saving}
            onPress={payFullAmount}
            style={({ pressed }) => [
              styles.shortcutButton,
              pressed && !saving && styles.shortcutButtonPressed,
              saving && styles.buttonDisabled,
            ]}
          >
            <Text style={styles.shortcutText}>Pagar integralmente</Text>
            <Text style={styles.shortcutHint}>
              Preenche o saldo restante
            </Text>
          </Pressable>
        </DesktopFormField>

        <DesktopFormField
          label="Conta bancária de origem"
          hint={
            selectedAccount
              ? `Saldo atual da conta: ${maskMoney(
                  formatCurrency(selectedAccount.balance),
                  hidden,
                )}`
              : 'Somente contas bancárias ativas podem ser usadas.'
          }
          grid
        >
          <DesktopFormSelect
            accessibilityLabel="Conta bancária de origem"
            value={form.accountId}
            options={activeAccounts.map((account) => ({
              value: account.id,
              label: `${account.name} · ${maskMoney(
                formatCurrency(account.balance),
                hidden,
              )}`,
            }))}
            onChange={(value) => updateField('accountId', value)}
            placeholder={
              accountsLoading
                ? 'Carregando contas...'
                : noActiveAccounts
                  ? 'Nenhuma conta ativa'
                  : 'Selecione a conta'
            }
            emptyLabel="Nenhuma conta bancária ativa disponível."
            disabled={saving || accountsLoading || noActiveAccounts}
          />
        </DesktopFormField>
      </View>

      {accountsError ? (
        <InlineFeedback
          variant="warning"
          title="Contas desatualizadas"
          message={`${accountsError} Atualize a página antes de pagar.`}
          style={styles.feedback}
        />
      ) : null}

      {noActiveAccounts ? (
        <InlineFeedback
          variant="warning"
          title="Nenhuma conta bancária ativa"
          message="Ative ou cadastre uma conta bancária para registrar o pagamento."
          style={styles.feedback}
        />
      ) : null}

      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>Impacto do pagamento</Text>
        <Text style={styles.noticeText}>
          O valor será debitado do saldo da conta bancária selecionada. O
          pagamento não cria uma despesa em Transações, pois as compras do
          cartão já representam as despesas. A fatura, o saldo da conta e o
          limite do cartão são atualizados pelo backend.
        </Text>
      </View>

      {formError ? (
        <InlineFeedback
          message={formError}
          variant="error"
          style={desktopFormStyles.feedback}
        />
      ) : null}
    </DesktopFormModal>
  );
}

const styles = StyleSheet.create({
  summary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    padding: 16,
    marginBottom: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: desktopColors.border,
    backgroundColor: desktopColors.surfaceMuted,
  },
  summaryBlock: {
    flexGrow: 1,
    flexBasis: 130,
    minWidth: 0,
    gap: 4,
  },
  summaryLabel: {
    color: desktopColors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontFamily: desktopFont,
  },
  summaryValue: {
    color: desktopColors.text,
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    fontFamily: desktopFont,
  },
  summaryValueMuted: {
    color: desktopColors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    fontFamily: desktopFont,
  },
  remainingValue: {
    color: desktopColors.primary,
    fontSize: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    fontFamily: desktopFont,
  },
  shortcutButton: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: desktopColors.primary,
    backgroundColor: desktopColors.primarySoft,
  },
  shortcutButtonPressed: {
    opacity: 0.8,
  },
  shortcutText: {
    color: desktopColors.primary,
    fontSize: 11,
    fontWeight: '800',
    fontFamily: desktopFont,
  },
  shortcutHint: {
    marginTop: 2,
    color: desktopColors.textMuted,
    fontSize: 9,
    fontFamily: desktopFont,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  feedback: {
    marginBottom: 12,
  },
  notice: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: desktopColors.border,
    backgroundColor: desktopColors.surfaceMuted,
  },
  noticeTitle: {
    color: desktopColors.text,
    fontSize: 11,
    fontWeight: '800',
    fontFamily: desktopFont,
  },
  noticeText: {
    marginTop: 5,
    color: desktopColors.textSecondary,
    fontSize: 11,
    lineHeight: 17,
    fontFamily: desktopFont,
  },
});

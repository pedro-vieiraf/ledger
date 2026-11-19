import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { CurrencyInput } from '@/components/currency-input';
import { InlineFeedback } from '@/components/feedback/inline-feedback';
import { mobileColors, mobileFont } from '@/constants/mobile-theme';
import { usePrivacy } from '@/contexts/privacy-context';
import { useInvoicePaymentForm } from '@/hooks/use-invoice-payment-form';
import type {
  CreditCardInvoice,
  CreditCardPayment,
  CreditCardPaymentResult,
} from '@/services/credit-card-invoices-api';
import { maskMoney } from '@/utils/privacy';

const colors = {
  surface: mobileColors.surface,
  surfaceMuted: mobileColors.surfaceMuted,
  primary: mobileColors.primary,
  primaryLight: mobileColors.primarySoft,
  text: mobileColors.text,
  secondary: mobileColors.textSecondary,
  border: mobileColors.border,
  overlay: 'rgba(18, 28, 22, 0.42)',
};

const CLOSE_ICON = {
  ios: 'xmark',
  android: 'close',
  web: 'close',
} satisfies SymbolViewProps['name'];

const SELECTED_ICON = {
  ios: 'checkmark.circle.fill',
  android: 'check_circle',
  web: 'check_circle',
} satisfies SymbolViewProps['name'];

const UNSELECTED_ICON = {
  ios: 'circle',
  android: 'radio_button_unchecked',
  web: 'radio_button_unchecked',
} satisfies SymbolViewProps['name'];

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

type MobileInvoicePaymentModalProps = {
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

/** Formulário mobile de pagamento parcial ou integral de fatura. */
export function MobileInvoicePaymentModal({
  cardId,
  cardName,
  invoice,
  onClose,
  onConfirmed,
  onInvoiceUpdated,
}: MobileInvoicePaymentModalProps) {
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

  const noActiveAccounts = !accountsLoading && activeAccounts.length === 0;

  function closeForm() {
    if (!saving) {
      onClose();
    }
  }

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={closeForm}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerTexts}>
              <Text style={styles.eyebrow}>PAGAMENTO DE FATURA</Text>
              <Text style={styles.title}>Pagar fatura</Text>
              <Text style={styles.description}>
                Registre o pagamento da fatura de {cardName}. O valor é
                debitado da conta bancária escolhida.
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fechar formulário"
              onPress={closeForm}
              disabled={saving}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && !saving && styles.pressed,
                saving && styles.disabled,
              ]}
            >
              <SymbolView
                name={CLOSE_ICON}
                size={18}
                tintColor={colors.secondary}
              />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
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
            </View>

            <View style={styles.remainingBlock}>
              <Text style={styles.summaryLabel}>Saldo restante</Text>
              <Text
                style={styles.remainingValue}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {maskMoney(formatCurrency(invoice.remainingAmount), hidden)}
              </Text>
            </View>

            <Text style={styles.fieldLabel}>Valor do pagamento</Text>
            <CurrencyInput
              accessibilityLabel="Valor do pagamento em reais"
              style={styles.input}
              value={form.amount}
              onChangeValue={(value) => updateField('amount', value)}
              returnKeyType="done"
              editable={!saving}
            />
            <Text style={styles.fieldHint}>
              O valor deve ser maior que zero e não pode exceder o saldo
              restante.
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Pagar integralmente o saldo restante"
              disabled={saving}
              onPress={payFullAmount}
              style={({ pressed }) => [
                styles.shortcutButton,
                pressed && !saving && styles.pressed,
                saving && styles.disabled,
              ]}
            >
              <Text style={styles.shortcutText}>Pagar integralmente</Text>
              <Text style={styles.shortcutHint}>Preenche o saldo restante</Text>
            </Pressable>

            <Text style={styles.fieldLabel}>Conta bancária de origem</Text>

            {accountsLoading ? (
              <View style={styles.accountsLoading}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>Carregando contas...</Text>
              </View>
            ) : noActiveAccounts ? (
              <InlineFeedback
                variant="warning"
                title="Nenhuma conta bancária ativa"
                message="Ative ou cadastre uma conta bancária para registrar o pagamento."
                style={styles.feedback}
              />
            ) : (
              <View style={styles.accountsList}>
                {activeAccounts.map((account) => {
                  const selected = form.accountId === account.id;

                  return (
                    <Pressable
                      key={account.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected, disabled: saving }}
                      disabled={saving}
                      onPress={() => updateField('accountId', account.id)}
                      style={({ pressed }) => [
                        styles.accountRow,
                        selected && styles.accountRowSelected,
                        pressed && !saving && styles.pressed,
                        saving && styles.disabled,
                      ]}
                    >
                      <View style={styles.accountInfo}>
                        <Text
                          style={[
                            styles.accountName,
                            selected && styles.accountNameSelected,
                          ]}
                          numberOfLines={1}
                        >
                          {account.name}
                        </Text>
                        <Text style={styles.accountBalance} numberOfLines={1}>
                          Saldo atual:{' '}
                          {maskMoney(
                            formatCurrency(account.balance),
                            hidden,
                          )}
                        </Text>
                      </View>

                      <SymbolView
                        name={selected ? SELECTED_ICON : UNSELECTED_ICON}
                        size={20}
                        tintColor={
                          selected ? colors.primary : colors.secondary
                        }
                      />
                    </Pressable>
                  );
                })}
              </View>
            )}

            {accountsError ? (
              <InlineFeedback
                variant="warning"
                title="Contas desatualizadas"
                message={`${accountsError} Atualize a página antes de pagar.`}
                style={styles.feedback}
              />
            ) : null}

            <View style={styles.notice}>
              <Text style={styles.noticeTitle}>Impacto do pagamento</Text>
              <Text style={styles.noticeText}>
                O valor será debitado do saldo da conta bancária selecionada. O
                pagamento não cria uma despesa em Transações, pois as compras
                do cartão já representam as despesas. A fatura, o saldo da
                conta e o limite do cartão são atualizados pelo backend.
              </Text>
            </View>

            {formError ? (
              <InlineFeedback
                message={formError}
                variant="error"
                style={styles.feedback}
              />
            ) : null}
          </ScrollView>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: saving }}
              onPress={closeForm}
              disabled={saving}
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && !saving && styles.pressed,
                saving && styles.disabled,
              ]}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityState={{
                disabled: saving || noActiveAccounts || accountsLoading,
                busy: saving,
              }}
              onPress={() => void save()}
              disabled={saving || noActiveAccounts || accountsLoading}
              style={({ pressed }) => [
                styles.saveButton,
                pressed &&
                  !saving &&
                  !noActiveAccounts &&
                  !accountsLoading &&
                  styles.pressed,
                (saving || noActiveAccounts || accountsLoading) &&
                  styles.disabled,
              ]}
            >
              <Text style={styles.saveButtonText}>
                {saving ? 'Pagando...' : 'Pagar fatura'}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: colors.overlay,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '92%',
    borderRadius: 22,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTexts: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    color: colors.secondary,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    fontFamily: mobileFont,
  },
  title: {
    marginTop: 6,
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    fontFamily: mobileFont,
  },
  description: {
    marginTop: 5,
    color: colors.secondary,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: mobileFont,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  body: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 8,
  },
  summary: {
    flexDirection: 'row',
    gap: 16,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  summaryBlock: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  summaryLabel: {
    color: colors.secondary,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontFamily: mobileFont,
  },
  summaryValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    fontFamily: mobileFont,
  },
  summaryValueMuted: {
    color: colors.secondary,
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    fontFamily: mobileFont,
  },
  remainingBlock: {
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.primaryLight,
    gap: 4,
  },
  remainingValue: {
    color: colors.primary,
    fontSize: 24,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    fontFamily: mobileFont,
  },
  fieldLabel: {
    marginTop: 18,
    marginBottom: 8,
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: mobileFont,
  },
  input: {
    paddingHorizontal: 13,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    color: colors.text,
    fontSize: 14,
    fontFamily: mobileFont,
  },
  fieldHint: {
    marginTop: 6,
    color: colors.secondary,
    fontSize: 11,
    lineHeight: 16,
    fontFamily: mobileFont,
  },
  shortcutButton: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  shortcutText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: mobileFont,
  },
  shortcutHint: {
    marginTop: 2,
    color: colors.secondary,
    fontSize: 9,
    fontFamily: mobileFont,
  },
  accountsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  loadingText: {
    color: colors.secondary,
    fontSize: 12,
    fontFamily: mobileFont,
  },
  accountsList: {
    gap: 8,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  accountRowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  accountInfo: {
    flex: 1,
    minWidth: 0,
  },
  accountName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: mobileFont,
  },
  accountNameSelected: {
    color: colors.primary,
  },
  accountBalance: {
    marginTop: 3,
    color: colors.secondary,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    fontFamily: mobileFont,
  },
  feedback: {
    marginTop: 12,
  },
  notice: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  noticeTitle: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
    fontFamily: mobileFont,
  },
  noticeText: {
    marginTop: 5,
    color: colors.secondary,
    fontSize: 11,
    lineHeight: 17,
    fontFamily: mobileFont,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 9,
    paddingHorizontal: 22,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  cancelButton: {
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: mobileFont,
  },
  saveButton: {
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: mobileFont,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.6,
  },
});

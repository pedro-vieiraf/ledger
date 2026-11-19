import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { CurrencyInput } from '@/components/currency-input';
import DatePickerField from '@/components/date-picker-field';
import { InlineFeedback } from '@/components/feedback/inline-feedback';
import { mobileColors, mobileFont } from '@/constants/mobile-theme';
import { usePrivacy } from '@/contexts/privacy-context';
import { useCreditCardPurchaseForm } from '@/hooks/use-credit-card-purchase-form';
import type { CreditCard } from '@/services/credit-cards-api';
import type { CreditCardPurchase } from '@/services/credit-card-purchases-api';
import {
  MAX_INSTALLMENT_DIGITS,
  parseInstallmentCount,
  type CreditCardPurchaseModality,
} from '@/utils/credit-card-purchase-form';
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

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

type MobileCreditCardPurchaseFormModalProps = {
  card: CreditCard;
  onClose: () => void;
  onCreated?: (purchase: CreditCardPurchase) => void | Promise<void>;
};

/** Formulário mobile de nova compra no cartão. */
export function MobileCreditCardPurchaseFormModal({
  card,
  onClose,
  onCreated,
}: MobileCreditCardPurchaseFormModalProps) {
  const { hidden } = usePrivacy();
  const { form, updateField, saving, formError, save } =
    useCreditCardPurchaseForm({ card, onClose, onCreated });

  const isInstallments = form.modality === 'installments';
  const installmentCount = parseInstallmentCount(form.installmentCount);

  function closeForm() {
    if (!saving) {
      onClose();
    }
  }

  function selectModality(modality: CreditCardPurchaseModality) {
    updateField('modality', modality);
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
              <Text style={styles.eyebrow}>CARTÃO DE CRÉDITO</Text>
              <Text style={styles.title}>Nova compra</Text>
              <Text style={styles.description}>
                Registre uma compra em {card.name}. Limite disponível:{' '}
                {maskMoney(
                  currencyFormatter.format(card.availableLimit),
                  hidden,
                )}
                .
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
            <Text style={styles.fieldLabel}>Descrição</Text>
            <TextInput
              accessibilityLabel="Descrição da compra"
              style={styles.input}
              value={form.description}
              onChangeText={(value) => updateField('description', value)}
              placeholder="Ex.: Mercado do mês"
              placeholderTextColor={colors.secondary}
              autoCapitalize="sentences"
              maxLength={120}
              returnKeyType="next"
              editable={!saving}
            />

            <Text style={styles.fieldLabel}>Valor total</Text>
            <CurrencyInput
              accessibilityLabel="Valor total da compra em reais"
              style={styles.input}
              value={form.amount}
              onChangeValue={(value) => updateField('amount', value)}
              returnKeyType="next"
              editable={!saving}
            />

            <Text style={styles.fieldLabel}>Data da compra</Text>
            <View style={styles.dateField}>
              <DatePickerField
                value={form.purchaseDate}
                onChange={(value) => updateField('purchaseDate', value)}
                accessibilityLabel="Data da compra"
              />
            </View>

            <Text style={styles.fieldLabel}>Modalidade</Text>
            <View style={styles.modalityRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{
                  selected: form.modality === 'single',
                  disabled: saving,
                }}
                disabled={saving}
                onPress={() => selectModality('single')}
                style={({ pressed }) => [
                  styles.modalityOption,
                  form.modality === 'single' && styles.modalityOptionSelected,
                  pressed && !saving && styles.pressed,
                  saving && styles.disabled,
                ]}
              >
                <Text
                  style={[
                    styles.modalityText,
                    form.modality === 'single' &&
                      styles.modalityTextSelected,
                  ]}
                >
                  À vista
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityState={{
                  selected: form.modality === 'installments',
                  disabled: saving,
                }}
                disabled={saving}
                onPress={() => selectModality('installments')}
                style={({ pressed }) => [
                  styles.modalityOption,
                  form.modality === 'installments' &&
                    styles.modalityOptionSelected,
                  pressed && !saving && styles.pressed,
                  saving && styles.disabled,
                ]}
              >
                <Text
                  style={[
                    styles.modalityText,
                    form.modality === 'installments' &&
                      styles.modalityTextSelected,
                  ]}
                >
                  Parcelada
                </Text>
              </Pressable>
            </View>

            {isInstallments ? (
              <>
                <Text style={styles.fieldLabel}>Quantidade de parcelas</Text>
                <TextInput
                  accessibilityLabel="Quantidade de parcelas"
                  style={styles.input}
                  value={form.installmentCount}
                  onChangeText={(value) =>
                    updateField(
                      'installmentCount',
                      value
                        .replace(/\D/g, '')
                        .slice(0, MAX_INSTALLMENT_DIGITS),
                    )
                  }
                  placeholder="Ex.: 6"
                  placeholderTextColor={colors.secondary}
                  keyboardType="number-pad"
                  maxLength={MAX_INSTALLMENT_DIGITS}
                  editable={!saving}
                />
                <Text style={styles.fieldHint}>
                  Entre 2 e 99 e sem exceder o valor da compra em centavos.
                </Text>
              </>
            ) : null}

            {isInstallments ? (
              <View style={styles.preview}>
                <Text style={styles.previewTitle}>Prévia informativa</Text>
                <Text style={styles.previewText}>
                  {installmentCount && installmentCount >= 2
                    ? `${installmentCount} parcelas. `
                    : ''}
                  O backend distribui os valores entre as faturas e ajusta os
                  centavos para que a soma corresponda exatamente ao valor
                  total. Os valores oficiais aparecem após o registro.
                </Text>
              </View>
            ) : null}

            <View style={styles.notice}>
              <Text style={styles.noticeTitle}>
                Como esta compra é registrada
              </Text>
              <Text style={styles.noticeText}>
                A compra compromete o limite e as faturas do cartão. Ela não
                reduz o saldo da conta e não aparece como despesa em
                Transações; o saldo só é reduzido no pagamento da fatura.
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
              accessibilityState={{ disabled: saving, busy: saving }}
              onPress={() => void save()}
              disabled={saving}
              style={({ pressed }) => [
                styles.saveButton,
                pressed && !saving && styles.pressed,
                saving && styles.disabled,
              ]}
            >
              <Text style={styles.saveButtonText}>
                {saving ? 'Registrando...' : 'Registrar compra'}
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
  fieldLabel: {
    marginBottom: 8,
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: mobileFont,
  },
  input: {
    marginBottom: 16,
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
  dateField: {
    marginBottom: 16,
  },
  modalityRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  modalityOption: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  modalityOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  modalityText: {
    color: colors.secondary,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: mobileFont,
  },
  modalityTextSelected: {
    color: colors.primary,
  },
  fieldHint: {
    marginTop: -10,
    marginBottom: 16,
    color: colors.secondary,
    fontSize: 11,
    lineHeight: 16,
    fontFamily: mobileFont,
  },
  preview: {
    marginBottom: 14,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.primaryLight,
  },
  previewTitle: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontFamily: mobileFont,
  },
  previewText: {
    marginTop: 6,
    color: colors.secondary,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: mobileFont,
  },
  notice: {
    marginBottom: 14,
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
  feedback: {
    marginBottom: 10,
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

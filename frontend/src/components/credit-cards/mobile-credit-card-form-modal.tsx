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
import { InlineFeedback } from '@/components/feedback/inline-feedback';
import {
  mobileColors,
  mobileFont,
} from '@/constants/mobile-theme';
import { useCreditCardForm } from '@/hooks/use-credit-card-form';
import type { CreditCard } from '@/services/credit-cards-api';
import { CREDIT_CARD_CURRENCY_LABEL } from '@/utils/credit-card-form';

const colors = {
  surface: mobileColors.surface,
  surfaceMuted: mobileColors.surfaceMuted,
  primary: mobileColors.primary,
  text: mobileColors.text,
  secondary: mobileColors.textSecondary,
  border: mobileColors.border,
  warning: '#A36A1F',
};

const CLOSE_ICON = {
  ios: 'xmark',
  android: 'close',
  web: 'close',
} satisfies SymbolViewProps['name'];

type MobileCreditCardFormModalProps = {
  mode: 'create' | 'edit';
  card?: CreditCard | null;
  onClose: () => void;
};

/** Formulário mobile de criação/edição de cartão. */
export function MobileCreditCardFormModal({
  mode,
  card,
  onClose,
}: MobileCreditCardFormModalProps) {
  const {
    form,
    updateField,
    saving,
    formError,
    save,
    hasInvoices,
  } = useCreditCardForm({ mode, card, onClose });

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
              <Text style={styles.eyebrow}>CARTÃO DE CRÉDITO</Text>
              <Text style={styles.title}>
                {mode === 'edit' ? 'Editar cartão' : 'Novo cartão'}
              </Text>
              <Text style={styles.description}>
                {mode === 'edit'
                  ? 'Atualize os dados do cartão. O histórico e as faturas são preservados.'
                  : 'Preencha os dados para cadastrar um cartão de crédito.'}
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
            <Text style={styles.fieldLabel}>Nome ou identificação</Text>
            <TextInput
              accessibilityLabel="Nome ou identificação do cartão"
              style={styles.input}
              value={form.name}
              onChangeText={(value) => updateField('name', value)}
              placeholder="Ex.: Cartão principal"
              placeholderTextColor={colors.secondary}
              autoCapitalize="sentences"
              maxLength={80}
              returnKeyType="next"
              editable={!saving}
            />

            <Text style={styles.fieldLabel}>Instituição emissora</Text>
            <TextInput
              accessibilityLabel="Instituição emissora"
              style={styles.input}
              value={form.issuer}
              onChangeText={(value) => updateField('issuer', value)}
              placeholder="Ex.: Banco do Brasil"
              placeholderTextColor={colors.secondary}
              autoCapitalize="words"
              maxLength={80}
              returnKeyType="next"
              editable={!saving}
            />

            <Text style={styles.fieldLabel}>Limite total</Text>
            <CurrencyInput
              accessibilityLabel="Limite total em reais"
              style={styles.input}
              value={form.creditLimit}
              onChangeValue={(value) => updateField('creditLimit', value)}
              returnKeyType="next"
              editable={!saving}
            />
            <Text style={styles.fieldHint}>
              O limite não pode ser menor que o valor já comprometido.
            </Text>

            <View style={styles.daysRow}>
              <View style={styles.dayField}>
                <Text style={styles.fieldLabel}>Dia de fechamento</Text>
                <TextInput
                  accessibilityLabel="Dia de fechamento"
                  style={styles.input}
                  value={form.closingDay}
                  onChangeText={(value) =>
                    updateField(
                      'closingDay',
                      value.replace(/\D/g, '').slice(0, 2),
                    )
                  }
                  placeholder="Ex.: 20"
                  placeholderTextColor={colors.secondary}
                  keyboardType="number-pad"
                  maxLength={2}
                  editable={!saving}
                />
              </View>

              <View style={styles.dayField}>
                <Text style={styles.fieldLabel}>Dia de vencimento</Text>
                <TextInput
                  accessibilityLabel="Dia de vencimento"
                  style={styles.input}
                  value={form.dueDay}
                  onChangeText={(value) =>
                    updateField(
                      'dueDay',
                      value.replace(/\D/g, '').slice(0, 2),
                    )
                  }
                  placeholder="Ex.: 28"
                  placeholderTextColor={colors.secondary}
                  keyboardType="number-pad"
                  maxLength={2}
                  editable={!saving}
                />
              </View>
            </View>

            {hasInvoices ? (
              <Text style={styles.warningHint}>
                Este cartão já possui faturas; o dia de fechamento não pode ser
                alterado.
              </Text>
            ) : (
              <Text style={styles.fieldHint}>
                Dias de fechamento e vencimento devem estar entre 1 e 31.
              </Text>
            )}

            <Text style={styles.fieldLabel}>Moeda</Text>
            <View style={styles.readonlyField}>
              <Text style={styles.readonlyValue}>
                {CREDIT_CARD_CURRENCY_LABEL}
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
                {saving
                  ? 'Salvando...'
                  : mode === 'edit'
                    ? 'Salvar alterações'
                    : 'Criar cartão'}
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
    backgroundColor: 'rgba(18, 28, 22, 0.42)',
  },
  card: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
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
  fieldHint: {
    marginTop: -10,
    marginBottom: 16,
    color: colors.secondary,
    fontSize: 11,
    lineHeight: 16,
    fontFamily: mobileFont,
  },
  daysRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dayField: {
    flex: 1,
    minWidth: 0,
  },
  warningHint: {
    marginTop: -10,
    marginBottom: 16,
    color: colors.warning,
    fontSize: 11,
    lineHeight: 16,
    fontFamily: mobileFont,
  },
  readonlyField: {
    marginBottom: 16,
    paddingHorizontal: 13,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  readonlyValue: {
    color: colors.secondary,
    fontSize: 13,
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

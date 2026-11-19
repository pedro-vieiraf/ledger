import { CurrencyInput } from '@/components/currency-input';
import { desktopColors } from '@/components/desktop/desktop-theme';
import {
  DesktopFormActions,
  DesktopFormField,
  DesktopFormModal,
  desktopFormStyles,
} from '@/components/desktop/forms/desktop-form';
import { InlineFeedback } from '@/components/feedback/inline-feedback';
import { useCreditCardForm } from '@/hooks/use-credit-card-form';
import type { CreditCard } from '@/services/credit-cards-api';
import { CREDIT_CARD_CURRENCY_LABEL } from '@/utils/credit-card-form';
import { Text, TextInput, View } from 'react-native';

type DesktopCreditCardFormModalProps = {
  mode: 'create' | 'edit';
  card?: CreditCard | null;
  onClose: () => void;
};

/**
 * Formulário desktop de criação/edição de cartão.
 *
 * Compartilha validação e envio com a versão mobile através de
 * `useCreditCardForm`.
 */
export function DesktopCreditCardFormModal({
  mode,
  card,
  onClose,
}: DesktopCreditCardFormModalProps) {
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
    <DesktopFormModal
      onClose={closeForm}
      closeDisabled={saving}
      eyebrow="CARTÃO DE CRÉDITO"
      title={mode === 'edit' ? 'Editar cartão' : 'Novo cartão'}
      description={
        mode === 'edit'
          ? 'Atualize os dados do cartão. O histórico e as faturas são preservados.'
          : 'Preencha os dados para cadastrar um cartão de crédito.'
      }
      maxWidth={520}
      footer={
        <DesktopFormActions
          onCancel={closeForm}
          onSave={() => void save()}
          saveLabel={
            mode === 'edit' ? 'Salvar alterações' : 'Criar cartão'
          }
          saving={saving}
          cancelDisabled={saving}
        />
      }
    >
      <View style={desktopFormStyles.grid}>
        <DesktopFormField label="Nome ou identificação" grid>
          <TextInput
            accessibilityLabel="Nome ou identificação do cartão"
            value={form.name}
            onChangeText={(value) => updateField('name', value)}
            placeholder="Ex.: Cartão principal"
            placeholderTextColor={desktopColors.textMuted}
            style={desktopFormStyles.input}
            autoCapitalize="sentences"
            maxLength={80}
            returnKeyType="next"
            editable={!saving}
          />
        </DesktopFormField>

        <DesktopFormField label="Instituição emissora" grid>
          <TextInput
            accessibilityLabel="Instituição emissora"
            value={form.issuer}
            onChangeText={(value) => updateField('issuer', value)}
            placeholder="Ex.: Banco do Brasil"
            placeholderTextColor={desktopColors.textMuted}
            style={desktopFormStyles.input}
            autoCapitalize="words"
            maxLength={80}
            returnKeyType="next"
            editable={!saving}
          />
        </DesktopFormField>

        <DesktopFormField
          label="Limite total"
          hint="O limite não pode ser menor que o valor já comprometido."
          grid
        >
          <CurrencyInput
            accessibilityLabel="Limite total em reais"
            style={desktopFormStyles.input}
            value={form.creditLimit}
            onChangeValue={(value) => updateField('creditLimit', value)}
            returnKeyType="next"
            editable={!saving}
          />
        </DesktopFormField>

        <DesktopFormField label="Moeda" grid>
          <View style={desktopFormStyles.readonlyField}>
            <Text style={desktopFormStyles.readonlyValue}>
              {CREDIT_CARD_CURRENCY_LABEL}
            </Text>
          </View>
        </DesktopFormField>

        <DesktopFormField
          label="Dia de fechamento"
          hint={
            hasInvoices
              ? 'Este cartão já possui faturas; o fechamento não pode ser alterado.'
              : 'Entre 1 e 31.'
          }
          grid
        >
          <TextInput
            accessibilityLabel="Dia de fechamento"
            value={form.closingDay}
            onChangeText={(value) =>
              updateField(
                'closingDay',
                value.replace(/\D/g, '').slice(0, 2),
              )
            }
            placeholder="Ex.: 20"
            placeholderTextColor={desktopColors.textMuted}
            style={desktopFormStyles.input}
            keyboardType="number-pad"
            maxLength={2}
            editable={!saving}
          />
        </DesktopFormField>

        <DesktopFormField
          label="Dia de vencimento"
          hint="Entre 1 e 31."
          grid
        >
          <TextInput
            accessibilityLabel="Dia de vencimento"
            value={form.dueDay}
            onChangeText={(value) =>
              updateField('dueDay', value.replace(/\D/g, '').slice(0, 2))
            }
            placeholder="Ex.: 28"
            placeholderTextColor={desktopColors.textMuted}
            style={desktopFormStyles.input}
            keyboardType="number-pad"
            maxLength={2}
            editable={!saving}
          />
        </DesktopFormField>
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

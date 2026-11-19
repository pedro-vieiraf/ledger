import { StyleSheet, Text, TextInput, View } from 'react-native';

import { CurrencyInput } from '@/components/currency-input';
import DatePickerField from '@/components/date-picker-field';
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
import { useCreditCardPurchaseForm } from '@/hooks/use-credit-card-purchase-form';
import type { CreditCard } from '@/services/credit-cards-api';
import type { CreditCardPurchase } from '@/services/credit-card-purchases-api';
import {
  MAX_INSTALLMENT_DIGITS,
  parseInstallmentCount,
} from '@/utils/credit-card-purchase-form';
import { maskMoney } from '@/utils/privacy';

type DesktopCreditCardPurchaseFormModalProps = {
  card: CreditCard;
  onClose: () => void;
  onCreated?: (purchase: CreditCardPurchase) => void | Promise<void>;
};

/**
 * Formulário desktop de nova compra no cartão.
 *
 * Compartilha validação e envio com a versão mobile. Nenhum valor de parcela
 * é calculado aqui: a prévia apenas informa que a distribuição e o
 * arredondamento são responsabilidade do backend.
 */
export function DesktopCreditCardPurchaseFormModal({
  card,
  onClose,
  onCreated,
}: DesktopCreditCardPurchaseFormModalProps) {
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

  return (
    <DesktopFormModal
      onClose={closeForm}
      closeDisabled={saving}
      eyebrow="CARTÃO DE CRÉDITO"
      title="Nova compra"
      description={`Registre uma compra em ${card.name}. Limite disponível: ${maskMoney(
        formatCurrency(card.availableLimit),
        hidden,
      )}.`}
      maxWidth={560}
      footer={
        <DesktopFormActions
          onCancel={closeForm}
          onSave={() => void save()}
          saveLabel="Registrar compra"
          saving={saving}
          savingLabel="Registrando..."
          cancelDisabled={saving}
        />
      }
    >
      <View style={desktopFormStyles.grid}>
        <DesktopFormField label="Descrição" grid>
          <TextInput
            accessibilityLabel="Descrição da compra"
            value={form.description}
            onChangeText={(value) => updateField('description', value)}
            placeholder="Ex.: Mercado do mês"
            placeholderTextColor={desktopColors.textMuted}
            style={desktopFormStyles.input}
            autoCapitalize="sentences"
            maxLength={120}
            returnKeyType="next"
            editable={!saving}
          />
        </DesktopFormField>

        <DesktopFormField label="Valor total" grid>
          <CurrencyInput
            accessibilityLabel="Valor total da compra em reais"
            style={desktopFormStyles.input}
            value={form.amount}
            onChangeValue={(value) => updateField('amount', value)}
            returnKeyType="next"
            editable={!saving}
          />
        </DesktopFormField>

        <DesktopFormField label="Data da compra" grid>
          <DatePickerField
            variant="desktop"
            value={form.purchaseDate}
            onChange={(value) => updateField('purchaseDate', value)}
            accessibilityLabel="Data da compra"
          />
        </DesktopFormField>

        <DesktopFormField label="Modalidade" grid>
          <DesktopFormSelect
            accessibilityLabel="Modalidade da compra"
            value={form.modality}
            options={[
              { value: 'single', label: 'À vista' },
              { value: 'installments', label: 'Parcelada' },
            ]}
            onChange={(value) =>
              updateField(
                'modality',
                value === 'installments' ? 'installments' : 'single',
              )
            }
            disabled={saving}
          />
        </DesktopFormField>

        {isInstallments ? (
          <DesktopFormField
            label="Quantidade de parcelas"
            hint="Entre 2 e 99 e sem exceder o valor da compra em centavos."
            grid
          >
            <TextInput
              accessibilityLabel="Quantidade de parcelas"
              value={form.installmentCount}
              onChangeText={(value) =>
                updateField(
                  'installmentCount',
                  value.replace(/\D/g, '').slice(0, MAX_INSTALLMENT_DIGITS),
                )
              }
              placeholder="Ex.: 6"
              placeholderTextColor={desktopColors.textMuted}
              style={desktopFormStyles.input}
              keyboardType="number-pad"
              maxLength={MAX_INSTALLMENT_DIGITS}
              editable={!saving}
            />
          </DesktopFormField>
        ) : null}
      </View>

      {isInstallments ? (
        <View style={styles.preview}>
          <Text style={styles.previewTitle}>Prévia informativa</Text>
          <Text style={styles.previewText}>
            {installmentCount && installmentCount >= 2
              ? `${installmentCount} parcelas. `
              : ''}
            O backend distribui os valores entre as faturas e ajusta os
            centavos para que a soma corresponda exatamente ao valor total. Os
            valores oficiais aparecem após o registro.
          </Text>
        </View>
      ) : null}

      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>Como esta compra é registrada</Text>
        <Text style={styles.noticeText}>
          A compra compromete o limite e as faturas do cartão. Ela não reduz o
          saldo da conta e não aparece como despesa em Transações; o saldo só é
          reduzido no pagamento da fatura.
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
  preview: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: desktopColors.border,
    backgroundColor: desktopColors.primarySoft,
  },
  previewTitle: {
    color: desktopColors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontFamily: desktopFont,
  },
  previewText: {
    marginTop: 6,
    color: desktopColors.textSecondary,
    fontSize: 12,
    lineHeight: 19,
    fontFamily: desktopFont,
  },
  notice: {
    marginTop: 12,
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

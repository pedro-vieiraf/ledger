import { useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { CurrencyInput } from '@/components/currency-input';
import { desktopColors } from '@/components/desktop/desktop-theme';
import {
  DesktopFormActions,
  DesktopFormField,
  DesktopFormModal,
  desktopFormStyles,
} from '@/components/desktop/forms/desktop-form';
import { InlineFeedback } from '@/components/feedback/inline-feedback';
import { useAccounts } from '@/contexts/accounts-context';
import { useFeedback } from '@/contexts/feedback-context';
import {
  createAccount as createAccountRequest,
  updateAccount as updateAccountRequest,
  type Account,
} from '@/services/accounts-api';
import {
  emptyAccountForm,
  validateAccountForm,
  type AccountFormValues,
} from '@/utils/accounts';

export type DesktopAccountFormMode = 'create' | 'edit';

type DesktopAccountFormModalProps = {
  mode: DesktopAccountFormMode;
  account?: Account | null;
  onClose: () => void;
};

const ACCOUNT_TYPES = [
  ['CHECKING', 'Conta corrente'],
  ['SAVINGS', 'Poupança'],
] as const;

/**
 * Formulário desktop de criação/edição de conta.
 *
 * Reutiliza a validação compartilhada e as operações de `accounts-api`, que já
 * atualizam os saldos pelo backend através do context de contas.
 */
export function DesktopAccountFormModal({
  mode,
  account,
  onClose,
}: DesktopAccountFormModalProps) {
  const { showToast } = useFeedback();
  const { refreshAccounts } = useAccounts();
  const mutationInProgressRef = useRef(false);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState<AccountFormValues>(() =>
    mode === 'edit' && account
      ? { name: account.name, type: account.type, openingBalance: 0 }
      : emptyAccountForm,
  );

  function closeForm() {
    if (saving) {
      return;
    }

    onClose();
  }

  async function saveAccount() {
    if (mutationInProgressRef.current) {
      return;
    }

    const validationError = validateAccountForm(form, {
      isEditing: mode === 'edit',
    });

    if (validationError) {
      setFormError(validationError);
      return;
    }

    mutationInProgressRef.current = true;
    setSaving(true);
    setFormError('');

    try {
      if (mode === 'edit' && account) {
        await updateAccountRequest(account.id, {
          name: form.name.trim(),
          type: form.type,
        });
      } else {
        await createAccountRequest({
          name: form.name.trim(),
          type: form.type,
          openingBalance: form.openingBalance,
          currency: 'BRL',
        });
      }

      await refreshAccounts();

      showToast({
        variant: 'success',
        title: mode === 'edit' ? 'Conta atualizada' : 'Conta criada',
        message:
          mode === 'edit'
            ? 'As alterações foram salvas.'
            : 'A conta já está disponível para uso.',
      });

      onClose();
    } catch (cause) {
      setFormError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível salvar a conta.',
      );
    } finally {
      mutationInProgressRef.current = false;
      setSaving(false);
    }
  }

  return (
    <DesktopFormModal
      onClose={closeForm}
      closeDisabled={saving}
      eyebrow="DETALHES DA CONTA"
      title={mode === 'edit' ? 'Editar conta' : 'Nova conta'}
      description={
        mode === 'edit'
          ? 'Atualize os dados da sua conta.'
          : 'Preencha os dados para cadastrar uma conta.'
      }
      maxWidth={480}
      footer={
        <DesktopFormActions
          onCancel={closeForm}
          onSave={() => void saveAccount()}
          saveLabel={
            mode === 'edit' ? 'Salvar alterações' : 'Criar conta'
          }
          saving={saving}
          cancelDisabled={saving}
        />
      }
    >
      <DesktopFormField label="Nome da conta">
        <TextInput
          accessibilityLabel="Nome da conta"
          value={form.name}
          onChangeText={(name) => {
            setForm((current) => ({ ...current, name }));
            setFormError('');
          }}
          placeholder="Ex.: Conta principal"
          placeholderTextColor={desktopColors.textMuted}
          style={desktopFormStyles.input}
          autoCapitalize="sentences"
          maxLength={80}
          returnKeyType="next"
          editable={!saving}
        />
      </DesktopFormField>

      <DesktopFormField label="Tipo de conta">
        <View style={desktopFormStyles.optionRow}>
          {ACCOUNT_TYPES.map(([type, label]) => {
            const isSelected = form.type === type;

            return (
              <Pressable
                key={type}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                disabled={saving}
                onPress={() =>
                  setForm((current) => ({ ...current, type }))
                }
                style={({ pressed }) => [
                  desktopFormStyles.optionButton,
                  isSelected && desktopFormStyles.optionButtonSelected,
                  pressed &&
                    !isSelected &&
                    desktopFormStyles.optionButtonPressed,
                ]}
              >
                <Text
                  style={[
                    desktopFormStyles.optionButtonText,
                    isSelected &&
                      desktopFormStyles.optionButtonTextSelected,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </DesktopFormField>

      {mode === 'create' ? (
        <DesktopFormField
          label="Saldo inicial"
          hint="Informe um valor igual ou maior que zero."
        >
          <CurrencyInput
            accessibilityLabel="Saldo inicial em reais"
            style={desktopFormStyles.input}
            value={form.openingBalance}
            onChangeValue={(openingBalance) => {
              setForm((current) => ({ ...current, openingBalance }));
              setFormError('');
            }}
            returnKeyType="done"
            editable={!saving}
          />
        </DesktopFormField>
      ) : null}

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

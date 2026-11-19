import { useRef, useState } from 'react';

import { useCreditCards } from '@/contexts/credit-cards-context';
import { useFeedback } from '@/contexts/feedback-context';
import {
  createCreditCard as createCreditCardRequest,
  updateCreditCard as updateCreditCardRequest,
  type CreditCard,
} from '@/services/credit-cards-api';
import { getCreditCardErrorMessage } from '@/utils/credit-card-errors';
import {
  buildCreditCardUpdateInput,
  emptyCreditCardForm,
  toCreateCreditCardInput,
  validateCreditCardForm,
  type CreditCardFormValues,
} from '@/utils/credit-card-form';
import { getCommittedLimit } from '@/utils/credit-cards';

type UseCreditCardFormOptions = {
  mode: 'create' | 'edit';
  card?: CreditCard | null;
  onClose: () => void;
};

function getInitialForm(
  mode: 'create' | 'edit',
  card: CreditCard | null,
): CreditCardFormValues {
  if (mode === 'edit' && card) {
    return {
      name: card.name,
      issuer: card.issuer,
      creditLimit: card.creditLimit,
      closingDay: String(card.closingDay),
      dueDay: String(card.dueDay),
      currency: card.currency || 'BRL',
    };
  }

  return emptyCreditCardForm;
}

/**
 * Estado e envio compartilhados pelos formulários de cartão.
 *
 * Reutiliza a validação, o patch parcial e o contexto de cartões para que
 * desktop e mobile tenham exatamente o mesmo comportamento.
 */
export function useCreditCardForm({
  mode,
  card,
  onClose,
}: UseCreditCardFormOptions) {
  const { showToast } = useFeedback();
  const { refreshCreditCards, invoicesByCard } = useCreditCards();
  const editCard = mode === 'edit' ? (card ?? null) : null;

  const [form, setForm] = useState<CreditCardFormValues>(() =>
    getInitialForm(mode, editCard),
  );
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const mutationInProgressRef = useRef(false);

  function updateField<K extends keyof CreditCardFormValues>(
    field: K,
    value: CreditCardFormValues[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
    setFormError('');
  }

  async function save() {
    if (mutationInProgressRef.current) {
      return;
    }

    const validationError = validateCreditCardForm(
      form,
      editCard && form.creditLimit < editCard.creditLimit
        ? { committedLimit: getCommittedLimit(editCard) }
        : undefined,
    );

    if (validationError) {
      setFormError(validationError);
      return;
    }

    const updateInput = editCard
      ? buildCreditCardUpdateInput(editCard, form)
      : null;

    // Sem campos alterados não há requisição; evita anunciar uma atualização
    // que não aconteceu.
    if (updateInput && Object.keys(updateInput).length === 0) {
      showToast({
        variant: 'info',
        title: 'Nenhuma alteração',
        message: 'Os dados do cartão já estão atualizados.',
      });
      onClose();
      return;
    }

    mutationInProgressRef.current = true;
    setSaving(true);
    setFormError('');

    try {
      if (editCard && updateInput) {
        await updateCreditCardRequest(editCard.id, updateInput);
      } else {
        await createCreditCardRequest(toCreateCreditCardInput(form));
      }

      // A mutação já foi confirmada pelo backend; uma falha ao recarregar a
      // lista não deve fazer o formulário achar que ela falhou.
      await refreshCreditCards().catch(() => {
        // A listagem mantém os dados anteriores até a próxima atualização.
      });

      showToast({
        variant: 'success',
        title: editCard ? 'Cartão atualizado' : 'Cartão criado',
        message: editCard
          ? 'As alterações foram salvas.'
          : 'O cartão já está disponível para uso.',
      });

      onClose();
    } catch (cause) {
      setFormError(
        getCreditCardErrorMessage(cause, editCard ? 'update' : 'create'),
      );
    } finally {
      mutationInProgressRef.current = false;
      setSaving(false);
    }
  }

  return {
    form,
    updateField,
    saving,
    formError,
    save,
    /** Indica que o fechamento não poderá ser alterado no backend. */
    hasInvoices: editCard
      ? (invoicesByCard[editCard.id]?.length ?? 0) > 0
      : false,
  };
}

import { useRef, useState } from 'react';

import { useCreditCards } from '@/contexts/credit-cards-context';
import { useFeedback } from '@/contexts/feedback-context';
import type { CreditCard } from '@/services/credit-cards-api';
import {
  createCreditCardPurchase,
  type CreditCardPurchase,
} from '@/services/credit-card-purchases-api';
import { getCreditCardPurchaseErrorMessage } from '@/utils/credit-card-purchase-errors';
import {
  createEmptyCreditCardPurchaseForm,
  toCreateCreditCardPurchaseInput,
  validateCreditCardPurchaseForm,
  type CreditCardPurchaseFormValues,
} from '@/utils/credit-card-purchase-form';

type UseCreditCardPurchaseFormOptions = {
  card: CreditCard;
  onClose: () => void;
  /** Recarrega a listagem de compras do detalhe após o registro. */
  onCreated?: (purchase: CreditCardPurchase) => void | Promise<void>;
};

function generatePurchaseId() {
  const cryptoApi = globalThis.crypto as
    | { randomUUID?: () => string }
    | undefined;

  if (cryptoApi?.randomUUID) {
    return cryptoApi.randomUUID();
  }

  // Fallback sem dependência nativa: UUID v4 válido para o DTO do backend.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : (random & 0x3) | 0x8;

    return value.toString(16);
  });
}

/**
 * Estado e envio compartilhados pelos formulários de compra.
 *
 * O identificador é gerado uma única vez por abertura do formulário e
 * reutilizado em novas tentativas, mantendo a criação idempotente quando a
 * resposta anterior foi ambígua (timeout ou queda de conexão). O backend
 * continua sendo a autoridade sobre limite, faturas e distribuição das
 * parcelas.
 */
export function useCreditCardPurchaseForm({
  card,
  onClose,
  onCreated,
}: UseCreditCardPurchaseFormOptions) {
  const { showToast } = useFeedback();
  const { refreshCreditCards } = useCreditCards();

  const [purchaseId] = useState(generatePurchaseId);
  const [form, setForm] = useState<CreditCardPurchaseFormValues>(
    createEmptyCreditCardPurchaseForm,
  );
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const mutationInProgressRef = useRef(false);

  function updateField<K extends keyof CreditCardPurchaseFormValues>(
    field: K,
    value: CreditCardPurchaseFormValues[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
    setFormError('');
  }

  async function save() {
    if (mutationInProgressRef.current) {
      return;
    }

    if (card.status !== 'ACTIVE') {
      setFormError(
        'Este cartão está inativo. Reative-o para registrar novas compras.',
      );
      return;
    }

    const validationError = validateCreditCardPurchaseForm(form);

    if (validationError) {
      setFormError(validationError);
      return;
    }

    mutationInProgressRef.current = true;
    setSaving(true);
    setFormError('');

    try {
      const purchase = await createCreditCardPurchase(
        card.id,
        toCreateCreditCardPurchaseInput(form, { id: purchaseId }),
      );

      // A compra já foi confirmada pelo backend; falhas ao recarregar não
      // podem fazer o formulário achar que o registro falhou.
      await refreshCreditCards().catch(() => {
        // O detalhe mantém os dados anteriores até a próxima atualização.
      });

      if (onCreated) {
        try {
          await onCreated(purchase);
        } catch {
          // A listagem será recarregada no próximo foco da tela.
        }
      }

      showToast({
        variant: 'success',
        title: 'Compra registrada',
        message:
          purchase.installmentCount === 1
            ? 'A compra foi adicionada à fatura correspondente.'
            : `A compra foi distribuída em ${purchase.installmentCount} parcelas pelo backend.`,
      });

      onClose();
    } catch (cause) {
      setFormError(getCreditCardPurchaseErrorMessage(cause, 'create'));
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
  };
}

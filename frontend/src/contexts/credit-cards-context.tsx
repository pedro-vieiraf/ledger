import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  getCreditCardInvoices,
  type CreditCardInvoice,
} from '@/services/credit-card-invoices-api';
import {
  getCreditCards,
  type CreditCard,
} from '@/services/credit-cards-api';

type CreditCardsContextValue = {
  cards: CreditCard[];
  /** Faturas por cartão; cartões sem faturas ficam com lista vazia. */
  invoicesByCard: Record<string, CreditCardInvoice[]>;
  loading: boolean;
  error: string | null;
  /**
   * Falha ao carregar faturas não impede a exibição dos cartões: os dados já
   * conhecidos permanecem disponíveis e este erro é apenas informativo.
   */
  invoicesError: string | null;
  refreshCreditCards: (options?: { silent?: boolean }) => Promise<void>;
};

const INVOICES_ERROR_MESSAGE =
  'Não foi possível atualizar as faturas de alguns cartões.';

const CreditCardsContext = createContext<CreditCardsContextValue | null>(null);

async function fetchInvoicesByCard(cards: CreditCard[]) {
  // As faturas são carregadas em paralelo e de forma independente: uma falha
  // parcial não deve derrubar a lista de cartões.
  const results = await Promise.allSettled(
    cards.map(async (card) => ({
      cardId: card.id,
      invoices: await getCreditCardInvoices(card.id),
    })),
  );

  const invoicesByCard: Record<string, CreditCardInvoice[]> = {};
  let failures = 0;

  for (const result of results) {
    if (result.status === 'fulfilled') {
      invoicesByCard[result.value.cardId] = result.value.invoices;
    } else {
      failures += 1;
    }
  }

  return { invoicesByCard, failures };
}

function mergeInvoices(
  current: Record<string, CreditCardInvoice[]>,
  cards: CreditCard[],
  loaded: Record<string, CreditCardInvoice[]>,
) {
  const validIds = new Set(cards.map((card) => card.id));
  const merged: Record<string, CreditCardInvoice[]> = {};

  // Descarta faturas de cartões que deixaram de existir e preserva as faturas
  // anteriores dos cartões cuja consulta falhou agora.
  for (const [cardId, invoices] of Object.entries(current)) {
    if (validIds.has(cardId)) {
      merged[cardId] = invoices;
    }
  }

  return { ...merged, ...loaded };
}

export function CreditCardsProvider({ children }: { children: ReactNode }) {
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [invoicesByCard, setInvoicesByCard] = useState<
    Record<string, CreditCardInvoice[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invoicesError, setInvoicesError] = useState<string | null>(null);

  const refreshCreditCards = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setLoading(true);
      }

      setError(null);

      try {
        const cardsData = await getCreditCards();
        setCards(cardsData);

        const { invoicesByCard: loaded, failures } =
          await fetchInvoicesByCard(cardsData);

        setInvoicesByCard((current) =>
          mergeInvoices(current, cardsData, loaded),
        );
        setInvoicesError(failures > 0 ? INVOICES_ERROR_MESSAGE : null);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Não foi possível carregar os cartões.';

        setError(message);
        throw err;
      } finally {
        if (!options?.silent) {
          setLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;

    getCreditCards()
      .then(async (cardsData) => {
        if (cancelled) {
          return;
        }

        setCards(cardsData);

        const { invoicesByCard: loaded, failures } =
          await fetchInvoicesByCard(cardsData);

        if (cancelled) {
          return;
        }

        setInvoicesByCard((current) =>
          mergeInvoices(current, cardsData, loaded),
        );
        setInvoicesError(failures > 0 ? INVOICES_ERROR_MESSAGE : null);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Não foi possível carregar os cartões.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<CreditCardsContextValue>(
    () => ({
      cards,
      invoicesByCard,
      loading,
      error,
      invoicesError,
      refreshCreditCards,
    }),
    [cards, invoicesByCard, loading, error, invoicesError, refreshCreditCards],
  );

  return (
    <CreditCardsContext value={value}>{children}</CreditCardsContext>
  );
}

export function useCreditCards() {
  const context = useContext(CreditCardsContext);

  if (!context) {
    throw new Error(
      'useCreditCards must be used within a CreditCardsProvider.',
    );
  }

  return context;
}

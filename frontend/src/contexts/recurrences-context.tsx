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
  activateRecurrence as activateRecurrenceRequest,
  cancelRecurrence as cancelRecurrenceRequest,
  createRecurrence as createRecurrenceRequest,
  deleteRecurrence as deleteRecurrenceRequest,
  getRecurrences,
  updateRecurrence as updateRecurrenceRequest,
  type CreateRecurrenceInput,
  type Recurrence,
  type UpdateRecurrenceInput,
} from '@/services/recurrences-api';

type RecurrencesContextValue = {
  recurrences: Recurrence[];
  loading: boolean;
  error: string | null;
  refreshRecurrences: () => Promise<void>;
  createRecurrence: (input: CreateRecurrenceInput) => Promise<Recurrence>;
  updateRecurrence: (
    id: string,
    input: UpdateRecurrenceInput,
  ) => Promise<Recurrence>;
  cancelRecurrence: (id: string) => Promise<Recurrence>;
  activateRecurrence: (id: string) => Promise<Recurrence>;
  deleteRecurrence: (id: string) => Promise<void>;
};

const RecurrencesContext =
  createContext<RecurrencesContextValue | null>(null);

function errorMessage(cause: unknown) {
  return cause instanceof Error
    ? cause.message
    : 'Não foi possível carregar as recorrências.';
}

export function RecurrencesProvider({ children }: { children: ReactNode }) {
  const [recurrences, setRecurrences] = useState<Recurrence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshRecurrences = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getRecurrences();

      setRecurrences(data);
    } catch (cause) {
      setError(errorMessage(cause));
      throw cause;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    getRecurrences()
      .then((data) => {
        if (!cancelled) {
          setRecurrences(data);
          setError(null);
        }
      })
      .catch((cause) => {
        if (!cancelled) {
          setError(errorMessage(cause));
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

  // A mutação já foi confirmada pelo backend; uma falha ao recarregar não
  // deve fazer a tela achar que a operação falhou.
  const refreshAfterMutation = useCallback(async () => {
    await refreshRecurrences().catch(() => {
      // O erro de recarga já fica exposto pelo estado do context.
    });
  }, [refreshRecurrences]);

  const value = useMemo<RecurrencesContextValue>(
    () => ({
      recurrences,
      loading,
      error,
      refreshRecurrences,

      async createRecurrence(input) {
        const created = await createRecurrenceRequest(input);

        await refreshAfterMutation();

        return created;
      },

      async updateRecurrence(id, input) {
        const updated = await updateRecurrenceRequest(id, input);

        await refreshAfterMutation();

        return updated;
      },

      async cancelRecurrence(id) {
        const cancelled = await cancelRecurrenceRequest(id);

        await refreshAfterMutation();

        return cancelled;
      },

      async activateRecurrence(id) {
        const activated = await activateRecurrenceRequest(id);

        await refreshAfterMutation();

        return activated;
      },

      async deleteRecurrence(id) {
        await deleteRecurrenceRequest(id);

        await refreshAfterMutation();
      },
    }),
    [
      recurrences,
      loading,
      error,
      refreshRecurrences,
      refreshAfterMutation,
    ],
  );

  return (
    <RecurrencesContext value={value}>
      {children}
    </RecurrencesContext>
  );
}

export function useRecurrences() {
  const context = useContext(RecurrencesContext);

  if (!context) {
    throw new Error(
      'useRecurrences must be used within a RecurrencesProvider.',
    );
  }

  return context;
}

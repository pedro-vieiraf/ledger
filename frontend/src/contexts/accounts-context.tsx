
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
  getAccounts,
  type Account as ApiAccount,
  type AccountType,
  type AccountStatus,
} from '@/services/accounts-api';

export type { AccountType, AccountStatus };

export type Account = ApiAccount;

type AccountsContextValue = {
  accounts: Account[];
  loading: boolean;
  error: string | null;
  refreshAccounts: () => Promise<void>;
  createAccount: (account: Account) => void;
  updateAccount: (
      id: string,
      updates: Pick<Account, 'name' | 'type'>,
  ) => void;
  deactivateAccount: (id: string) => void;
  reactivateAccount: (id: string) => void;
  adjustAccountBalance: (id: string, amount: number) => void;
};

const AccountsContext = createContext<AccountsContextValue | null>(null);

export function AccountsProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getAccounts();
      setAccounts(data);
    } catch (err) {
      const message =
          err instanceof Error
              ? err.message
              : 'Não foi possível carregar as contas.';

      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshAccounts().catch(() => {
      // O erro já foi armazenado no estado para a interface poder exibi-lo.
    });
  }, [refreshAccounts]);

  const value = useMemo<AccountsContextValue>(
      () => ({
        accounts,
        loading,
        error,
        refreshAccounts,

        createAccount(account) {
          setAccounts((current) => [
            account,
            ...current.filter((item) => item.id !== account.id),
          ]);
        },

        updateAccount(id, updates) {
          setAccounts((current) =>
              current.map((account) =>
                  account.id === id ? { ...account, ...updates } : account,
              ),
          );
        },

        deactivateAccount(id) {
          setAccounts((current) =>
              current.map((account) =>
                  account.id === id
                      ? { ...account, status: 'INACTIVE' }
                      : account,
              ),
          );
        },

        reactivateAccount(id) {
          setAccounts((current) =>
              current.map((account) =>
                  account.id === id
                      ? { ...account, status: 'ACTIVE' }
                      : account,
              ),
          );
        },

        adjustAccountBalance(_id, _amount) {
          throw new Error(
              'Os saldos são gerenciados pelo backend. ' +
              'Use refreshAccounts() para atualizar os saldos.',
          );
        },
      }),
      [accounts, error, loading, refreshAccounts],
  );

  return (
      <AccountsContext value={value}>
        {children}
      </AccountsContext>
  );
}

export function useAccounts() {
  const context = useContext(AccountsContext);

  if (!context) {
    throw new Error(
        'useAccounts must be used within an AccountsProvider.',
    );
  }

  return context;
}

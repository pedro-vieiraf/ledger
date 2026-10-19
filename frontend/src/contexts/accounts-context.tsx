import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type AccountType = 'CHECKING' | 'SAVINGS';
export type AccountStatus = 'ACTIVE' | 'INACTIVE';

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  status: AccountStatus;
  balance: number;
};

type AccountsContextValue = {
  accounts: Account[];
  createAccount: (account: Account) => void;
  updateAccount: (
    id: string,
    updates: Pick<Account, 'name' | 'type'>,
  ) => void;
  deactivateAccount: (id: string) => void;
  reactivateAccount: (id: string) => void;
  adjustAccountBalance: (id: string, amount: number) => void;
};

const initialAccounts: Account[] = [
  {
    id: '1',
    name: 'Conta principal',
    type: 'CHECKING',
    status: 'ACTIVE',
    balance: 4850.9,
  },
  {
    id: '2',
    name: 'Reserva de emergência',
    type: 'SAVINGS',
    status: 'ACTIVE',
    balance: 3200,
  },
  {
    id: '3',
    name: 'Conta antiga',
    type: 'CHECKING',
    status: 'INACTIVE',
    balance: 0,
  },
];

const AccountsContext = createContext<AccountsContextValue | null>(null);

export function AccountsProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);

  const value = useMemo<AccountsContextValue>(
    () => ({
      accounts,

      createAccount(account) {
        setAccounts((current) => [account, ...current]);
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
            account.id === id ? { ...account, status: 'INACTIVE' } : account,
          ),
        );
      },

      reactivateAccount(id) {
        setAccounts((current) =>
          current.map((account) =>
            account.id === id ? { ...account, status: 'ACTIVE' } : account,
          ),
        );
      },

      adjustAccountBalance(id, amount) {
        if (!Number.isFinite(amount) || amount === 0) {
          throw new Error('O ajuste de saldo deve ser um valor válido e diferente de zero.');
        }

        setAccounts((current) => {
          const account = current.find((item) => item.id === id);

          if (!account) {
            throw new Error('Conta não encontrada.');
          }

          if (account.status !== 'ACTIVE') {
            throw new Error('Não é possível movimentar uma conta inativa.');
          }

          return current.map((item) =>
            item.id === id
              ? { ...item, balance: item.balance + amount }
              : item,
          );
        });
      },
    }),
    [accounts],
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
    throw new Error('useAccounts must be used within an AccountsProvider.');
  }

  return context;
}
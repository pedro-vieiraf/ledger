import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type PrivacyContextValue = {
  hidden: boolean;
  setHidden: (hidden: boolean) => void;
  toggle: () => void;
};

const PrivacyContext = createContext<PrivacyContextValue | null>(null);

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(false);

  const toggle = useCallback(() => {
    setHidden((current) => !current);
  }, []);

  const value = useMemo<PrivacyContextValue>(
    () => ({
      hidden,
      setHidden,
      toggle,
    }),
    [hidden, toggle],
  );

  return (
    <PrivacyContext value={value}>
      {children}
    </PrivacyContext>
  );
}

export function usePrivacy() {
  const context = useContext(PrivacyContext);

  if (!context) {
    throw new Error('usePrivacy must be used within a PrivacyProvider.');
  }

  return context;
}

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Animated } from 'react-native';

import {
  ToastHost,
  type ToastMessage,
} from '@/components/feedback/toast-host';
import type { FeedbackVariant } from '@/components/feedback/feedback-theme';

export type ShowToastInput = {
  title: string;
  message?: string;
  variant?: FeedbackVariant;
  duration?: number;
};

type FeedbackContextValue = {
  showToast: (input: ShowToastInput) => void;
  dismissToast: () => void;
};

const DEFAULT_DURATIONS: Record<FeedbackVariant, number> = {
  success: 3500,
  info: 4000,
  warning: 5000,
  error: 6000,
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<ToastMessage | null>(null);
  const currentRef = useRef<ToastMessage | null>(null);
  const queueRef = useRef<ToastMessage[]>([]);
  const nextIdRef = useRef(0);
  const [progress] = useState(() => new Animated.Value(0));
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const outAnimationRef = useRef(false);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const clearNextTimer = useCallback(() => {
    if (nextTimerRef.current) {
      clearTimeout(nextTimerRef.current);
      nextTimerRef.current = null;
    }
  }, []);

  const startNext = useCallback(() => {
    if (
      currentRef.current ||
      outAnimationRef.current ||
      queueRef.current.length === 0
    ) {
      return;
    }

    const next = queueRef.current.shift();

    if (!next) {
      return;
    }

    currentRef.current = next;
    setCurrent(next);
  }, []);

  const dismissToast = useCallback(() => {
    if (!currentRef.current || outAnimationRef.current) {
      return;
    }

    outAnimationRef.current = true;
    clearHideTimer();

    Animated.timing(progress, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(({ finished }) => {
      outAnimationRef.current = false;

      if (!finished) {
        return;
      }

      currentRef.current = null;
      setCurrent(null);

      clearNextTimer();
      nextTimerRef.current = setTimeout(() => {
        nextTimerRef.current = null;
        startNext();
      }, 80);
    });
  }, [
    clearHideTimer,
    clearNextTimer,
    progress,
    startNext,
  ]);

  const showToast = useCallback((input: ShowToastInput) => {
    const variant = input.variant ?? 'info';
    const toast: ToastMessage = {
      id: nextIdRef.current + 1,
      title: input.title,
      message: input.message,
      variant,
      duration: input.duration ?? DEFAULT_DURATIONS[variant],
    };

    nextIdRef.current = toast.id;

    if (!currentRef.current && !outAnimationRef.current) {
      currentRef.current = toast;
      setCurrent(toast);
      return;
    }

    queueRef.current.push(toast);
  }, []);

  useEffect(() => {
    if (!current) {
      return;
    }

    clearHideTimer();
    clearNextTimer();
    outAnimationRef.current = false;
    progress.setValue(0);

    Animated.timing(progress, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();

    hideTimerRef.current = setTimeout(dismissToast, current.duration);

    return clearHideTimer;
  }, [
    clearHideTimer,
    clearNextTimer,
    current,
    dismissToast,
    progress,
  ]);

  useEffect(
    () => () => {
      clearHideTimer();
      clearNextTimer();
      progress.stopAnimation();
    },
    [clearHideTimer, clearNextTimer, progress],
  );

  const value = useMemo(
    () => ({
      showToast,
      dismissToast,
    }),
    [dismissToast, showToast],
  );

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <ToastHost
        toast={current}
        progress={progress}
        onDismiss={dismissToast}
      />
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const context = useContext(FeedbackContext);

  if (!context) {
    throw new Error(
      'useFeedback must be used inside a FeedbackProvider.',
    );
  }

  return context;
}

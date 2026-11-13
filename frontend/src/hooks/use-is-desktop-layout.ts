import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

export const DESKTOP_BREAKPOINT = 1024;

const DESKTOP_MEDIA_QUERY = `(min-width: ${DESKTOP_BREAKPOINT}px)`;

function subscribe(onStoreChange: () => void) {
  if (
    Platform.OS !== 'web' ||
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return () => {};
  }

  const mediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);
  mediaQuery.addEventListener('change', onStoreChange);

  return () => mediaQuery.removeEventListener('change', onStoreChange);
}

function getSnapshot() {
  if (
    Platform.OS !== 'web' ||
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return false;
  }

  return window.matchMedia(DESKTOP_MEDIA_QUERY).matches;
}

function getServerSnapshot() {
  // O SSR sempre começa pelo layout mobile. O cliente atualiza para o desktop
  // logo após a hidratação, sem divergência de markup.
  return false;
}

/**
 * Indica se a experiência desktop deve ser usada.
 *
 * O breakpoint é aplicado somente na web; no mobile o layout existente
 * continua sendo renderizado em qualquer largura.
 */
export function useIsDesktopLayout() {
  return useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
}

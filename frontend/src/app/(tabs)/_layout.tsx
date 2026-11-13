import { Slot } from 'expo-router';

import AppTabs from '@/components/app-tabs';
import { useIsDesktopLayout } from '@/hooks/use-is-desktop-layout';

export default function TabsLayout() {
  const isDesktop = useIsDesktopLayout();

  if (isDesktop) {
    return <Slot />;
  }

  return <AppTabs />;
}

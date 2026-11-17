import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { DesktopSidebar } from '@/components/desktop/desktop-sidebar';
import { DesktopTopbar } from '@/components/desktop/desktop-topbar';
import { desktopColors } from '@/components/desktop/desktop-theme';

export function DesktopShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <View style={styles.root}>
      <DesktopSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((current) => !current)}
      />

      <View style={styles.main}>
        <DesktopTopbar />
        <View style={styles.content}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
    flexDirection: 'row',
    backgroundColor: desktopColors.background,
  },
  main: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    backgroundColor: desktopColors.background,
  },
  content: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    backgroundColor: desktopColors.background,
  },
});

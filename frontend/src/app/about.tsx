import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  desktopColors,
  desktopFont,
  desktopLayout,
  desktopShadows,
} from '@/components/desktop/desktop-theme';
import { useIsDesktopLayout } from '@/hooks/use-is-desktop-layout';

export default function AboutScreen() {
  const router = useRouter();
  const isDesktop = useIsDesktopLayout();

  return (
    <View style={[styles.screen, isDesktop && styles.screenDesktop]}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Finora</Text>
        <Text style={styles.title}>Sobre a Finora</Text>
        <Text style={styles.text}>
          Esta seção será construída nas próximas etapas do redesign. Por
          enquanto, você pode continuar navegando pelas demais seções.
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.buttonText}>Voltar</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: desktopColors.background,
  },
  screenDesktop: {
    padding: desktopLayout.pagePadding,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    padding: 28,
    borderRadius: desktopLayout.radius,
    borderWidth: 1,
    borderColor: desktopColors.border,
    backgroundColor: desktopColors.surface,
    ...desktopShadows.card,
  },
  eyebrow: {
    color: desktopColors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontFamily: desktopFont,
  },
  title: {
    marginTop: 8,
    color: desktopColors.text,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.6,
    fontFamily: desktopFont,
  },
  text: {
    marginTop: 10,
    color: desktopColors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: desktopFont,
  },
  button: {
    alignSelf: 'flex-start',
    marginTop: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 11,
    backgroundColor: desktopColors.primarySoft,
  },
  buttonPressed: {
    opacity: 0.72,
  },
  buttonText: {
    color: desktopColors.primary,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: desktopFont,
  },
});

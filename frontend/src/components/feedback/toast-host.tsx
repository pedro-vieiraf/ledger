import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  feedbackPalettes,
  type FeedbackVariant,
} from '@/components/feedback/feedback-theme';

export type ToastMessage = {
  id: number;
  title: string;
  message?: string;
  variant: FeedbackVariant;
  duration: number;
};

type ToastHostProps = {
  toast: ToastMessage | null;
  progress: Animated.Value;
  onDismiss: () => void;
};

export function ToastHost({
  toast,
  progress,
  onDismiss,
}: ToastHostProps) {
  const insets = useSafeAreaInsets();

  if (!toast) {
    return null;
  }

  const palette = feedbackPalettes[toast.variant];

  return (
    <View
      pointerEvents="box-none"
      style={[styles.host, { paddingTop: insets.top + 10 }]}
    >
      <Animated.View
        accessibilityRole="alert"
        accessibilityLiveRegion={
          toast.variant === 'error' || toast.variant === 'warning'
            ? 'assertive'
            : 'polite'
        }
        pointerEvents="auto"
        style={[
          styles.toast,
          {
            opacity: progress,
            transform: [
              {
                translateY: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-12, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View
          style={[styles.icon, { backgroundColor: palette.accent }]}
        >
          <Text style={styles.iconText}>{palette.icon}</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{toast.title}</Text>
          {toast.message ? (
            <Text style={styles.message}>{toast.message}</Text>
          ) : null}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fechar aviso"
          onPress={onDismiss}
          style={({ pressed }) => [
            styles.closeButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.closeText}>×</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 1000,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    maxWidth: 560,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9ECE7',
    borderRadius: 16,
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.16,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  content: {
    flex: 1,
  },
  title: {
    color: '#202923',
    fontSize: 14,
    fontWeight: '800',
  },
  message: {
    color: '#5E675F',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: '#788078',
    fontSize: 22,
    lineHeight: 24,
  },
  pressed: {
    opacity: 0.65,
  },
});

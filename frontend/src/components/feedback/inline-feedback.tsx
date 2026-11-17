import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import {
  feedbackPalettes,
  type FeedbackVariant,
} from '@/components/feedback/feedback-theme';

type InlineFeedbackProps = {
  message: string;
  title?: string;
  variant?: FeedbackVariant;
  style?: StyleProp<ViewStyle>;
};

export function InlineFeedback({
  message,
  title,
  variant = 'error',
  style,
}: InlineFeedbackProps) {
  const palette = feedbackPalettes[variant];

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion={
        variant === 'error' || variant === 'warning' ? 'assertive' : 'polite'
      }
      style={[
        styles.container,
        {
          backgroundColor: palette.background,
          borderColor: palette.accent,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.icon,
          { backgroundColor: palette.accent },
        ]}
      >
        <Text style={styles.iconText}>{palette.icon}</Text>
      </View>

      <View style={styles.content}>
        {title ? (
          <Text style={[styles.title, { color: palette.accent }]}>
            {title}
          </Text>
        ) : null}
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    width: '100%',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  icon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  iconText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 2,
  },
  message: {
    color: '#202923',
    fontSize: 12,
    lineHeight: 18,
  },
});

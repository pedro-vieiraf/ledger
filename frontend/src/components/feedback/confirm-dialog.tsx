import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  confirmTones,
  type FeedbackTone,
} from '@/components/feedback/feedback-theme';
import { InlineFeedback } from '@/components/feedback/inline-feedback';

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: FeedbackTone;
  icon?: string;
  loading?: boolean;
  error?: string | null;
  embedded?: boolean;
};

export function ConfirmDialog({
  visible,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'danger',
  icon,
  loading = false,
  error,
  embedded = false,
}: ConfirmDialogProps) {
  const tonePalette = confirmTones[tone];

  function handleCancel() {
    if (!loading) {
      onCancel();
    }
  }

  const card = (
    <View
      accessibilityRole="alert"
      accessibilityViewIsModal
      style={styles.card}
    >
      <View
        style={[
          styles.icon,
          { backgroundColor: tonePalette.background },
        ]}
      >
        <Text style={[styles.iconText, { color: tonePalette.accent }]}>
          {icon ?? (tone === 'primary' ? '↻' : '!')}
        </Text>
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>

      {error ? (
        <InlineFeedback
          message={error}
          variant="error"
          style={styles.error}
        />
      ) : null}

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: loading }}
          onPress={handleCancel}
          disabled={loading}
          style={({ pressed }) => [
            styles.cancelButton,
            pressed && !loading && styles.pressed,
            loading && styles.disabled,
          ]}
        >
          <Text style={styles.cancelText}>{cancelLabel}</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: loading, busy: loading }}
          onPress={onConfirm}
          disabled={loading}
          style={({ pressed }) => [
            styles.confirmButton,
            { backgroundColor: tonePalette.accent },
            pressed && !loading && styles.pressed,
            loading && styles.disabled,
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.confirmText}>{confirmLabel}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );

  if (embedded) {
    if (!visible) {
      return null;
    }

    return (
      <View style={styles.embeddedOverlay}>
        <View style={styles.overlayContent}>{card}</View>
      </View>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.overlayContent}>{card}</View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(16, 24, 20, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  embeddedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(16, 24, 20, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 20,
    elevation: 20,
  },
  overlayContent: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 24,
    shadowColor: '#000000',
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  icon: {
    width: 50,
    height: 50,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconText: {
    fontSize: 23,
    fontWeight: '800',
  },
  title: {
    color: '#202923',
    fontSize: 19,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    color: '#5E675F',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 10,
  },
  error: {
    marginTop: 14,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 9,
    width: '100%',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E9ECE7',
    borderRadius: 11,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  cancelText: {
    color: '#202923',
    fontSize: 12,
    fontWeight: '700',
  },
  confirmButton: {
    flex: 1,
    borderRadius: 11,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.6,
  },
});

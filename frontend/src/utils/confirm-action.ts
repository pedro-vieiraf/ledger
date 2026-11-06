import { Alert, Platform } from 'react-native';

type ConfirmActionOptions = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
};

/**
 * Exibe uma mensagem de forma compatível com web e nativo.
 *
 * O Alert do react-native-web é um no-op, então usamos window.alert na web.
 */
export function showAlert(title: string, message?: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }

  Alert.alert(title, message);
}

/**
 * Pede confirmação de forma compatível com web e nativo.
 *
 * O Alert do react-native-web é um no-op, então usamos window.confirm na web.
 */
export function confirmAction({
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancelar',
  destructive = false,
  onConfirm,
}: ConfirmActionOptions) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }

    return;
  }

  Alert.alert(title, message, [
    { text: cancelLabel, style: 'cancel' },
    {
      text: confirmLabel,
      style: destructive ? 'destructive' : 'default',
      onPress: onConfirm,
    },
  ]);
}

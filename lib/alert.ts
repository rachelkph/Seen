import { Alert, Platform, type AlertButton } from 'react-native';

// Alert.alert that also works on the web, where react-native-web's Alert does nothing.
// Native: unchanged. Web: a Cancel button plus an action becomes window.confirm;
// otherwise window.alert, then the single button's onPress (e.g. "OK").
export function showAlert(title: string, message?: string, buttons?: AlertButton[]) {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }

  const text = message ? `${title}\n\n${message}` : title;
  const cancel = buttons?.find((button) => button.style === 'cancel');
  const action = buttons?.find((button) => button.style !== 'cancel');

  if (cancel && action) {
    if (window.confirm(text)) action.onPress?.();
    else cancel.onPress?.();
    return;
  }

  window.alert(text);
  action?.onPress?.();
}

import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

export async function openInAppBrowser(url: string): Promise<void> {
  const trimmedUrl = url.trim();
  if (!trimmedUrl) return;

  try {
    const canOpen = await Linking.canOpenURL(trimmedUrl);
    if (!canOpen) return;

    if (Platform.OS === 'android') {
      await WebBrowser.warmUpAsync();
    }

    await WebBrowser.openBrowserAsync(trimmedUrl, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
      controlsColor: '#C9A96E',
      showTitle: true,
      enableBarCollapsing: true,
    });
  } finally {
    if (Platform.OS === 'android') {
      await WebBrowser.coolDownAsync();
    }
  }
}

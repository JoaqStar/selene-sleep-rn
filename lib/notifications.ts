import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export type NotificationPermissionStatus = 'granted' | 'denied' | 'undetermined';

export async function requestNotificationPermissions(): Promise<NotificationPermissionStatus> {
  if (!Device.isDevice) {
    console.log('[Notifications] Not a physical device, skipping permission request');
    return 'undetermined';
  }

  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return 'granted';
  }

  const { status } = await Notifications.requestPermissionsAsync();
  if (status === 'granted' || status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return 'granted';
  }

  return status === 'denied' ? 'denied' : 'undetermined';
}

export async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('[Notifications] Push tokens are only available on physical devices');
    return null;
  }

  const status = await requestNotificationPermissions();
  if (status !== 'granted') {
    console.log('[Notifications] Permission not granted, cannot get push token');
    return null;
  }

  try {
    const projectId =
      Notifications?.expoConfig?.extra?.eas?.projectId ??
      process.env.EXPO_PUBLIC_EAS_PROJECT_ID;

    const token = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    console.log('[Notifications] Expo push token:', token.data);
    return token.data;
  } catch (error) {
    console.error('[Notifications] Failed to get Expo push token', error);
    return null;
  }
}

export function configureNotificationHandling() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: Platform.OS === 'ios',
      shouldSetBadge: false,
    }),
  });
}


export type NativePermissionState = NotificationPermission | 'unsupported';

export function getNativeNotificationPermission(): NativePermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export async function requestNativeNotificationPermission(): Promise<NativePermissionState> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    const perm = await Notification.requestPermission();
    return perm;
  } catch {
    return Notification.permission;
  }
}

export async function dispatchNativeNotification(params: {
  title: string;
  body: string;
  tag?: string;
}): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission !== 'granted') {
    return false;
  }

  const options: NotificationOptions = {
    body: params.body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: params.tag || 'nixora-helper-alert',
  };

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(params.title, options);
        return true;
      }
    }
  } catch {
    // Fallback to standard Notification constructor for desktop Windows browsers
  }

  try {
    new Notification(params.title, options);
    return true;
  } catch {
    return false;
  }
}

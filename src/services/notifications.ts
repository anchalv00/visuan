import { SoundAlert } from '../types/sound';

export const isNotificationSupported = (): boolean => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

export const getNotificationPermission = (): NotificationPermission => {
  if (!isNotificationSupported()) return 'denied';
  return Notification.permission;
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!isNotificationSupported()) return false;
  try {
    const result = await Notification.requestPermission();
    return result === 'granted';
  } catch (e) {
    console.warn('Error requesting notification permission:', e);
    return false;
  }
};

export const sendBackgroundNotification = (alert: SoundAlert, enabled: boolean) => {
  if (!enabled || !isNotificationSupported()) return;
  if (Notification.permission !== 'granted') return;

  // Prioritize sending if user is away or tab is hidden
  const isDocumentHidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';

  // Even if not hidden, urgent sounds can trigger system notification if allowed
  if (isDocumentHidden || alert.urgency === 'urgent') {
    try {
      const urgencyPrefix =
        alert.urgency === 'urgent'
          ? '🔴 [URGENT] '
          : alert.urgency === 'warning'
          ? '🟡 [WARNING] '
          : '🔵 [INFO] ';

      const title = `${urgencyPrefix}${alert.sound_name}`;
      const options: NotificationOptions = {
        body: `${alert.description} (${alert.direction_cue.toUpperCase()} direction)`,
        tag: alert.id,
        requireInteraction: alert.urgency === 'urgent',
        silent: true, // Deaf & HOH focus: don't play sound; rely on visual & device vibration
      };

      new Notification(title, options);
    } catch (err) {
      console.warn('Failed to dispatch notification:', err);
    }
  }
};

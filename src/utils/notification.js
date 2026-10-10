// Request browser permission for system desktop/mobile alerts
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support desktop notifications.');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

// Dispatch a system push notification
export const showBrowserNotification = (title, options = {}) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return null;
  }

  const notificationOptions = {
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: options.tag || 'thriftloop-alert',
    ...options,
  };

  try {
    const notification = new Notification(title, notificationOptions);

    if (options.url) {
      notification.onclick = () => {
        window.focus();
        window.location.href = options.url;
        notification.close();
      };
    }

    return notification;
  } catch (err) {
    console.error('Failed to trigger notification:', err);
    return null;
  }
};
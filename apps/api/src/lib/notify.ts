type PushMessage = {
  to: string;
  title: string;
  body: string;
  data?: object;
};

export async function sendPushNotifications(messages: PushMessage[]): Promise<void> {
  const valid = messages.filter(m => m.to && m.to.startsWith('ExponentPushToken'));
  if (valid.length === 0) return;

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(valid.map(m => ({ ...m, sound: 'default' }))),
    });
    if (!response.ok) {
      console.error('Expo push API error:', await response.text());
    }
  } catch (err) {
    console.error('Push notification send error:', err);
  }
}

export async function sendPushNotification(
  to: string,
  title: string,
  body: string,
  data?: object
): Promise<void> {
  return sendPushNotifications([{ to, title, body, data }]);
}

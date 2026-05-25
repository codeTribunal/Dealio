const FCM_URL = 'https://fcm.googleapis.com/fcm/send';

export async function sendPushNotification(
  fcmToken: string,
  title: string,
  body: string,
): Promise<void> {
  const serverKey = process.env.FCM_SERVER_KEY;
  if (!serverKey) return; // not configured — skip silently

  const res = await fetch(FCM_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `key=${serverKey}`,
    },
    body: JSON.stringify({
      to: fcmToken,
      notification: { title, body },
      priority: 'high',
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`FCM sendPushNotification failed (${res.status}): ${text}`);
  }
}

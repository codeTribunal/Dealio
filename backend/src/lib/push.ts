import admin from 'firebase-admin';
import { prisma } from './prisma.js';

function getApp(): admin.app.App | null {
  if (admin.apps.length > 0) return admin.apps[0]!;
  const json = process.env.FCM_SERVICE_ACCOUNT_JSON;
  if (!json) return null;
  try {
    const serviceAccount = JSON.parse(json) as admin.ServiceAccount;
    return admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  } catch (err) {
    console.error('[push] Failed to initialize Firebase Admin SDK:', err);
    return null;
  }
}

export async function sendPushNotification(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<void> {
  const app = getApp();
  if (!app) return;

  await admin.messaging(app).send({
    token,
    notification: { title, body },
    ...(data ? { data } : {}),
    android: { priority: 'high' },
    apns: { payload: { aps: { contentAvailable: true } } },
  });
}

// Sends to all registered device tokens for a business. Failures for
// individual tokens are ignored — stale tokens are a normal occurrence.
export async function sendPushToAll(
  businessId: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<void> {
  const app = getApp();
  if (!app) return;

  const rows = await prisma.deviceToken.findMany({
    where: { businessId },
    select: { token: true },
  });
  if (rows.length === 0) return;

  await Promise.allSettled(
    rows.map((r) => sendPushNotification(r.token, title, body, data)),
  );
}

import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

let isFirebaseInitialized = false;

try {
  const configDir = path.resolve(__dirname, '../config');
  let serviceAccountPath = path.join(configDir, 'app-xosolive-firebase-adminsdk-fbsvc-0ece81412e.json');
  if (!fs.existsSync(serviceAccountPath)) {
    serviceAccountPath = path.join(configDir, 'app-xosolive-firebase-adminsdk-fbsvc-024c98593a.json');
  }
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    isFirebaseInitialized = true;
    console.log('[FCM] Firebase Admin SDK initialized successfully with:', path.basename(serviceAccountPath));
  } else {
    console.warn('[FCM] Warning: Firebase service account JSON not found in', configDir);
  }
} catch (error) {
  console.error('[FCM] Error initializing Firebase Admin SDK:', error);
}

export const sendPushToTopic = async (
  topic: string,
  title: string,
  body: string,
  data?: Record<string, string>
) => {
  if (!isFirebaseInitialized) {
    console.warn('[FCM] Firebase Admin not initialized, skipping topic send');
    return null;
  }
  try {
    const message: admin.messaging.Message = {
      topic,
      notification: {
        title,
        body
      },
      data: {
        title,
        body,
        ...(data || {})
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'default'
        }
      }
    };
    const response = await admin.messaging().send(message);
    console.log(`[FCM] Successfully sent message to topic "${topic}":`, response);
    return response;
  } catch (error) {
    console.error(`[FCM] Error sending message to topic "${topic}":`, error);
    return null;
  }
};

export const sendPushToTokens = async (
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>
) => {
  if (!isFirebaseInitialized) {
    console.warn('[FCM] Firebase Admin not initialized, skipping tokens send');
    return null;
  }
  if (!tokens || tokens.length === 0) {
    return null;
  }
  try {
    const validTokens = tokens.filter(t => typeof t === 'string' && t.trim().length > 0);
    if (validTokens.length === 0) return null;

    const message: admin.messaging.MulticastMessage = {
      tokens: validTokens,
      notification: {
        title,
        body
      },
      data: {
        title,
        body,
        ...(data || {})
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'default'
        }
      }
    };
    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`[FCM] Sent to ${validTokens.length} devices. Success: ${response.successCount}, Failure: ${response.failureCount}`);
    return response;
  } catch (error) {
    console.error('[FCM] Error sending multicast message:', error);
    return null;
  }
};

export default {
  sendPushToTopic,
  sendPushToTokens
};

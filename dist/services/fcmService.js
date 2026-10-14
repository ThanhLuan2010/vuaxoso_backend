"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPushToTokens = exports.sendPushToTopic = void 0;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
let isFirebaseInitialized = false;
try {
    const candidateDirs = [
        path_1.default.resolve(process.cwd(), 'src/config'),
        path_1.default.resolve(process.cwd(), 'dist/config'),
        path_1.default.resolve(__dirname, '../../src/config'),
        path_1.default.resolve(__dirname, '../config')
    ];
    let resolvedPath = null;
    const preferredFiles = [
        'app-xosolive-firebase-adminsdk-fbsvc-0ece81412e.json',
        'app-xosolive-firebase-adminsdk-fbsvc-024c98593a.json'
    ];
    for (const dir of candidateDirs) {
        if (!fs_1.default.existsSync(dir))
            continue;
        for (const pref of preferredFiles) {
            const p = path_1.default.join(dir, pref);
            if (fs_1.default.existsSync(p)) {
                resolvedPath = p;
                break;
            }
        }
        if (resolvedPath)
            break;
        const files = fs_1.default.readdirSync(dir);
        for (const f of files) {
            if (f.endsWith('.json') && (f.includes('adminsdk') || f.includes('firebase'))) {
                resolvedPath = path_1.default.join(dir, f);
                break;
            }
        }
        if (resolvedPath)
            break;
    }
    if (resolvedPath && fs_1.default.existsSync(resolvedPath)) {
        const serviceAccount = JSON.parse(fs_1.default.readFileSync(resolvedPath, 'utf8'));
        firebase_admin_1.default.initializeApp({
            credential: firebase_admin_1.default.credential.cert(serviceAccount)
        });
        isFirebaseInitialized = true;
        console.log('[FCM] Firebase Admin SDK initialized successfully with:', resolvedPath);
    }
    else {
        console.warn('[FCM] Warning: Firebase service account JSON not found in candidate paths:', candidateDirs);
    }
}
catch (error) {
    console.error('[FCM] Error initializing Firebase Admin SDK:', error);
}
const sendPushToTopic = async (topic, title, body, data) => {
    if (!isFirebaseInitialized) {
        console.warn('[FCM] Firebase Admin not initialized, skipping topic send');
        return null;
    }
    try {
        const message = {
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
        const response = await firebase_admin_1.default.messaging().send(message);
        console.log(`[FCM] Successfully sent message to topic "${topic}":`, response);
        return response;
    }
    catch (error) {
        console.error(`[FCM] Error sending message to topic "${topic}":`, error);
        return null;
    }
};
exports.sendPushToTopic = sendPushToTopic;
const sendPushToTokens = async (tokens, title, body, data) => {
    if (!isFirebaseInitialized) {
        console.warn('[FCM] Firebase Admin not initialized, skipping tokens send');
        return null;
    }
    if (!tokens || tokens.length === 0) {
        return null;
    }
    try {
        const validTokens = tokens.filter(t => typeof t === 'string' && t.trim().length > 0);
        if (validTokens.length === 0)
            return null;
        const message = {
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
        const response = await firebase_admin_1.default.messaging().sendEachForMulticast(message);
        console.log(`[FCM] Sent to ${validTokens.length} devices. Success: ${response.successCount}, Failure: ${response.failureCount}`);
        return response;
    }
    catch (error) {
        console.error('[FCM] Error sending multicast message:', error);
        return null;
    }
};
exports.sendPushToTokens = sendPushToTokens;
exports.default = {
    sendPushToTopic: exports.sendPushToTopic,
    sendPushToTokens: exports.sendPushToTokens
};

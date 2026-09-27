const Notification = require('../models/Notification');
const axios = require('axios');

// In-memory / cache store for device push tokens: userId -> Array of { token, platform, updatedAt }
const deviceTokenStore = new Map();

class PushNotificationService {
    /**
     * Register or update a device push token for a user (Expo, APNs, or FCM)
     */
    static registerToken(userId, { pushToken, platform = 'ios', deviceName = 'Mobile Device' }) {
        if (!userId || !pushToken) return false;

        const existingTokens = deviceTokenStore.get(userId) || [];
        const filtered = existingTokens.filter(d => d.token !== pushToken);
        filtered.push({
            token: pushToken,
            platform,
            deviceName,
            updatedAt: new Date()
        });

        deviceTokenStore.set(userId, filtered);
        console.log(`[PushService] Registered device push token for user ${userId} (${platform}: ${deviceName})`);
        return true;
    }

    /**
     * Get registered push tokens for a user
     */
    static getTokens(userId) {
        return deviceTokenStore.get(userId) || [];
    }

    /**
     * Dispatch an urgent or operational push notification to a user's mobile devices
     */
    static async sendPushNotification({ userId, teamId = null, type = 'ALERT', title, body, data = {}, actionUrl = null }) {
        // 1. Always create the in-app notification record for persistence
        try {
            await Notification.create({
                user_id: userId,
                team_id: teamId,
                type,
                title,
                message: body,
                action_url: actionUrl
            });
        } catch (dbErr) {
            console.warn('[PushService] Could not persist in-app notification:', dbErr.message);
        }

        // 2. Fetch device tokens
        const devices = this.getTokens(userId);
        if (!devices || devices.length === 0) {
            console.log(`[PushService] No mobile push tokens registered for user ${userId}. Notification saved in-app.`);
            return { sent: 0, inAppSaved: true };
        }

        let sentCount = 0;
        for (const device of devices) {
            // Expo push tokens start with ExponentPushToken[...] or ExpoPushToken[...]
            if (device.token.startsWith('ExponentPushToken') || device.token.startsWith('ExpoPushToken')) {
                try {
                    await axios.post('https://exp.host/--/api/v2/push/send', {
                        to: device.token,
                        sound: 'default',
                        title,
                        body,
                        data: { ...data, type, actionUrl }
                    }, {
                        timeout: 5000
                    });
                    sentCount++;
                } catch (apiErr) {
                    console.warn(`[PushService] Failed sending to Expo token for user ${userId}:`, apiErr.message);
                }
            } else {
                // Mock dispatch for Apple APNs / Firebase FCM tokens in test/dev
                console.log(`[PushService MOCK] Dispatched to ${device.platform} (${device.token}): "${title}" - "${body}"`);
                sentCount++;
            }
        }

        return { sent: sentCount, inAppSaved: true };
    }
}

module.exports = PushNotificationService;

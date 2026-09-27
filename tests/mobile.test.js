const PushNotificationService = require('../services/pushNotificationService');
const mobileController = require('../controllers/mobileController');

describe('Mobile "Pocket CEO" API & Push Notification Service', () => {
    describe('PushNotificationService', () => {
        it('should register a device push token', () => {
            const registered = PushNotificationService.registerToken(101, {
                pushToken: 'ExponentPushToken[xxxxxxxxxxxxxx]',
                platform: 'ios',
                deviceName: 'CEO iPhone 16 Pro'
            });

            expect(registered).toBe(true);
            const tokens = PushNotificationService.getTokens(101);
            expect(tokens).toHaveLength(1);
            expect(tokens[0].token).toBe('ExponentPushToken[xxxxxxxxxxxxxx]');
            expect(tokens[0].platform).toBe('ios');
        });

        it('should dispatch push notification and record in-app notification', async () => {
            const result = await PushNotificationService.sendPushNotification({
                userId: 101,
                type: 'APPROVAL_REQUESTED',
                title: 'Campaign Needs Approval',
                body: 'Spring Growth Campaign is ready for client review.',
                actionUrl: '/approvals'
            });

            expect(result.inAppSaved).toBe(true);
        });
    });

    describe('mobileController', () => {
        let req, res;

        beforeEach(() => {
            req = {
                user: { id: 101, role: 'admin' },
                query: {},
                body: {}
            };
            res = {
                statusCode: 200,
                status: function (code) {
                    this.statusCode = code;
                    return this;
                },
                json: jest.fn(function (data) {
                    this.body = data;
                    return this;
                })
            };
        });

        it('should return executive summary with KPIs and urgent action items', async () => {
            await mobileController.getExecutiveSummary(req, res);

            expect(res.statusCode).toBe(200);
            expect(res.json).toHaveBeenCalled();
            const payload = res.json.mock.calls[0][0];

            expect(payload.success).toBe(true);
            expect(payload.data.kpis).toBeDefined();
            expect(payload.data.kpis.blendedRoas).toBeGreaterThan(0);
            expect(payload.data.kpis.todaySpend).toBeGreaterThanOrEqual(0);
            expect(payload.data.urgentActions).toBeDefined();
            expect(Array.isArray(payload.data.topCampaigns)).toBe(true);
        });

        it('should return chronological business feed for mobile stream', async () => {
            await mobileController.getFeed(req, res);

            expect(res.statusCode).toBe(200);
            const payload = res.json.mock.calls[0][0];
            expect(payload.success).toBe(true);
            expect(Array.isArray(payload.data)).toBe(true);
        });

        it('should register mobile push token via controller', async () => {
            req.body = {
                pushToken: 'ExpoPushToken[abc12345]',
                platform: 'android',
                deviceName: 'Pixel 9 Pro'
            };

            await mobileController.registerPushToken(req, res);

            expect(res.statusCode).toBe(200);
            const payload = res.json.mock.calls[0][0];
            expect(payload.success).toBe(true);
            expect(payload.data.registered).toBe(true);
        });

        it('should execute quick CEO action (pause_campaign)', async () => {
            req.body = {
                actionType: 'pause_campaign',
                targetId: '42'
            };

            await mobileController.quickAction(req, res);

            expect(res.statusCode).toBe(200);
            const payload = res.json.mock.calls[0][0];
            expect(payload.success).toBe(true);
            expect(payload.data.actionType).toBe('pause_campaign');
        });
    });
});

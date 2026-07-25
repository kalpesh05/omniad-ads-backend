const request = require('supertest');
const app = require('../app');
const prisma = require('../config/prisma');

describe('Billing API', () => {
    let token;
    let teamId;

    beforeAll(async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                email: 'billing@example.com',
                password: 'password123',
                firstName: 'Test',
                lastName: 'Billing'
            });
        token = res.body.data.token;
        const profileRes = await request(app).get('/api/users/profile').set('Authorization', `Bearer ${token}`);
        const user = profileRes.body.data.user;
        const team = await prisma.teams.findFirst({ where: { owner_id: user.id } });
        teamId = team.id;
    });

    it('should retrieve existing team settings', async () => {
        const res = await request(app)
            .get(`/api/teams/${teamId}/settings`)
            .set('Authorization', `Bearer ${token}`);
        
        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toBeTruthy();
    });

    it('should save Stripe configuration securely', async () => {
        const res = await request(app)
            .patch(`/api/teams/${teamId}/settings`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                stripe_secret_key: 'sk_test_123456',
                stripe_publishable_key: 'pk_test_123456',
                stripe_connected: true
            });
        
        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toBeTruthy();
        expect(res.body.data.settings).toHaveProperty('stripe_secret_key');
        expect(res.body.data.settings.stripe_secret_key).toEqual('sk_test_123456');
    });
});

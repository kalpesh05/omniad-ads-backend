const request = require('supertest');
const app = require('../app');
const prisma = require('../config/prisma');

describe('Client Portal API', () => {
    let token;
    let teamId;
    let magicLinkToken;

    beforeAll(async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                email: 'portal@example.com',
                password: 'password123',
                firstName: 'Test',
                lastName: 'Portal'
            });
        token = res.body.data.token;
        const profileRes = await request(app).get('/api/users/profile').set('Authorization', `Bearer ${token}`);
        const user = profileRes.body.data.user;
        const team = await prisma.teams.findFirst({ where: { owner_id: user.id } });
        teamId = team.id;
    });

    it('should generate a new magic link', async () => {
        const res = await request(app)
            .post('/api/client-portal/generate')
            .set('Authorization', `Bearer ${token}`)
            .send({
                teamId: teamId,
                clientName: 'Nike Test',
                clientEmail: 'client@nike.test'
            });
        
        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toBeTruthy();
        expect(res.body.data).toHaveProperty('magicLink');
        expect(res.body.data.portal).toHaveProperty('magic_link_token');
        
        magicLinkToken = res.body.data.portal.magic_link_token;
    });

    it('should verify a valid magic link', async () => {
        const res = await request(app)
            .get(`/api/client-portal/verify/${magicLinkToken}`);
            
        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toBeTruthy();
        expect(res.body.data.client_name).toEqual('Nike Test');
    });

    it('should reject an invalid magic link', async () => {
        const res = await request(app)
            .get(`/api/client-portal/verify/invalid-token-123`);
            
        expect(res.statusCode).toEqual(404);
        expect(res.body.success).toBeFalsy();
    });
});

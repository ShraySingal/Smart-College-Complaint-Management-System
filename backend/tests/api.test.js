const request = require('supertest');
const app = require('../server');
const { sequelize } = require('../config/db');

describe('API Endpoints', () => {
    beforeAll(async () => {
        // Ensure DB is connected
        await sequelize.authenticate();
    });

    afterAll(async () => {
        await sequelize.close();
    });

    test('GET /api/health returns 200', async () => {
        const res = await request(app).get('/api/health');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('status', 'UP');
    });

    test('POST /api/auth/login with invalid credentials returns 401', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'nonexistent@college.com',
                password: 'wrongpassword'
            });
        expect(res.statusCode).toEqual(401);
    });

    test('GET /api/complaints/all without token returns 401', async () => {
        const res = await request(app).get('/api/complaints/all');
        expect(res.statusCode).toEqual(401);
    });
});

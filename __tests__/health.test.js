const request = require('supertest');
const app = require('../app'); // Adjust the path to your app file

describe('Health Check Endpoint', () => {
    it('should return 200 OK', async () => {
        const response = await request(app).get('/health');
        expect(response.status).toBe(200);
    });

    it('should return a JSON response', async () => {
        const response = await request(app).get('/health');
        expect(response.headers['content-type']).toEqual(expect.stringContaining('json'));
    });

    it('should return the correct response body', async () => {
        const response = await request(app).get('/health');
        expect(response.body).toEqual({ status: 'ok' });
    });
});
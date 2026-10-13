const request = require('supertest');
const { createApp } = require('../src/app');

describe('Nara AC API app', () => {
  test('returns a JSON 404 for unknown routes', async () => {
    const app = createApp();
    const res = await request(app).get('/api/v1/unknown-route');

    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });
});

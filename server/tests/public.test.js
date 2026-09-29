const request = require('supertest');
const app = require('../src/app');
const testDb = require('./helpers/testDb');

beforeAll(async () => {
  await testDb.connect();
});

afterEach(async () => {
  await testDb.clear();
});

afterAll(async () => {
  await testDb.close();
});

async function registerUser(email) {
  const res = await request(app).post('/api/auth/register').send({
    name: 'Test User',
    email,
    password: 'password123',
  });
  return res.body.token;
}

describe('GET /api/public/trips/:id', () => {
  it('returns a trip that has been marked public', async () => {
    const token = await registerUser('owner@example.com');
    const created = await request(app)
      .post('/api/trips')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'Public Trip')
      .field('lat', '1')
      .field('lng', '1');

    await request(app)
      .put(`/api/trips/${created.body._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ isPublic: true });

    const res = await request(app).get(`/api/public/trips/${created.body._id}`);

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Public Trip');
  });

  it('returns 404 for a trip that exists but is private', async () => {
    const token = await registerUser('owner@example.com');
    const created = await request(app)
      .post('/api/trips')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'Private Trip')
      .field('lat', '1')
      .field('lng', '1');

    const res = await request(app).get(`/api/public/trips/${created.body._id}`);

    expect(res.status).toBe(404);
  });

  it('returns 404 for a trip id that does not exist', async () => {
    const res = await request(app).get('/api/public/trips/64f000000000000000000000');
    expect(res.status).toBe(404);
  });

  it('requires no authentication header at all', async () => {
    const token = await registerUser('owner@example.com');
    const created = await request(app)
      .post('/api/trips')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'Public Trip')
      .field('lat', '1')
      .field('lng', '1');

    await request(app)
      .put(`/api/trips/${created.body._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ isPublic: true });

    const res = await request(app).get(`/api/public/trips/${created.body._id}`);
    expect(res.status).not.toBe(401);
  });
});

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

async function registerUser(email, name = 'Test User') {
  const res = await request(app).post('/api/auth/register').send({
    name,
    email,
    password: 'password123',
  });
  return res.body.token;
}

describe('GET /api/public/trips', () => {
  it('lists public trips across all users, newest first, with owner name', async () => {
    const aliceToken = await registerUser('alice@example.com', 'Alice');
    const bobToken = await registerUser('bob@example.com', 'Bob');

    const aliceTrip = await request(app)
      .post('/api/trips')
      .set('Authorization', `Bearer ${aliceToken}`)
      .field('title', "Alice's Trip")
      .field('lat', '1')
      .field('lng', '1');
    await request(app)
      .put(`/api/trips/${aliceTrip.body._id}`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ isPublic: true });

    const bobTrip = await request(app)
      .post('/api/trips')
      .set('Authorization', `Bearer ${bobToken}`)
      .field('title', "Bob's Trip")
      .field('lat', '2')
      .field('lng', '2');
    await request(app)
      .put(`/api/trips/${bobTrip.body._id}`)
      .set('Authorization', `Bearer ${bobToken}`)
      .send({ isPublic: true });

    const res = await request(app).get('/api/public/trips');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].title).toBe("Bob's Trip");
    expect(res.body[0].owner.name).toBe('Bob');
    expect(res.body[1].owner.name).toBe('Alice');
  });

  it('excludes private trips', async () => {
    const token = await registerUser('owner@example.com', 'Owner');
    await request(app)
      .post('/api/trips')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'Private Trip')
      .field('lat', '1')
      .field('lng', '1');

    const res = await request(app).get('/api/public/trips');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });

  it('requires no authentication header at all', async () => {
    const res = await request(app).get('/api/public/trips');
    expect(res.status).not.toBe(401);
  });
});

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

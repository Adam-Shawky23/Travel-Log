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

describe('POST /api/trips', () => {
  it('creates a trip for the authenticated user', async () => {
    const token = await registerUser('owner@example.com');

    const res = await request(app)
      .post('/api/trips')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'Trip to Lisbon')
      .field('lat', '38.7223')
      .field('lng', '-9.1393')
      .field('locationName', 'Lisbon, Portugal');

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Trip to Lisbon');
    expect(res.body.location.lat).toBe(38.7223);
    expect(res.body.isPublic).toBe(false);
  });

  it('rejects trip creation without a token with 401', async () => {
    const res = await request(app).post('/api/trips').send({ title: 'No Auth' });
    expect(res.status).toBe(401);
  });

  it('rejects trip creation missing required fields with 400', async () => {
    const token = await registerUser('owner@example.com');
    const res = await request(app)
      .post('/api/trips')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'Missing Location');

    expect(res.status).toBe(400);
  });

  it('accepts a photo upload with an allowed image type', async () => {
    const token = await registerUser('owner@example.com');
    const res = await request(app)
      .post('/api/trips')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'Trip With Photo')
      .field('lat', '1')
      .field('lng', '1')
      .attach('photos', Buffer.from('fake-image-bytes'), {
        filename: 'photo.jpg',
        contentType: 'image/jpeg',
      });

    expect(res.status).toBe(201);
    expect(res.body.photos).toHaveLength(1);
    expect(res.body.photos[0]).toMatch(/^\/uploads\//);
  });

  it('rejects a photo upload with a disallowed file type with 400', async () => {
    const token = await registerUser('owner@example.com');
    const res = await request(app)
      .post('/api/trips')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'Trip With Bad File')
      .field('lat', '1')
      .field('lng', '1')
      .attach('photos', Buffer.from('not an image'), {
        filename: 'notes.txt',
        contentType: 'text/plain',
      });

    expect(res.status).toBe(400);
  });

  it('rejects a photo upload with an oversized file with 400', async () => {
    const token = await registerUser('owner@example.com');
    // Create a buffer larger than 5MB (5242880 bytes)
    const oversizedBuffer = Buffer.alloc(5 * 1024 * 1024 + 1);
    const res = await request(app)
      .post('/api/trips')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'Trip With Oversized Photo')
      .field('lat', '1')
      .field('lng', '1')
      .attach('photos', oversizedBuffer, {
        filename: 'large-photo.jpg',
        contentType: 'image/jpeg',
      });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/trips', () => {
  it("lists only the authenticated user's trips", async () => {
    const ownerToken = await registerUser('owner@example.com');
    const otherToken = await registerUser('other@example.com');

    await request(app)
      .post('/api/trips')
      .set('Authorization', `Bearer ${ownerToken}`)
      .field('title', 'Owner Trip')
      .field('lat', '1')
      .field('lng', '1');

    await request(app)
      .post('/api/trips')
      .set('Authorization', `Bearer ${otherToken}`)
      .field('title', 'Other Trip')
      .field('lat', '2')
      .field('lng', '2');

    const res = await request(app).get('/api/trips').set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Owner Trip');
  });
});

describe('GET /api/trips/:id', () => {
  it('returns 403 when a non-owner requests another user\'s trip', async () => {
    const ownerToken = await registerUser('owner@example.com');
    const otherToken = await registerUser('other@example.com');

    const created = await request(app)
      .post('/api/trips')
      .set('Authorization', `Bearer ${ownerToken}`)
      .field('title', 'Private Trip')
      .field('lat', '1')
      .field('lng', '1');

    const res = await request(app)
      .get(`/api/trips/${created.body._id}`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.status).toBe(403);
  });

  it('returns 404 for a trip id that does not exist', async () => {
    const token = await registerUser('owner@example.com');
    const res = await request(app)
      .get('/api/trips/64f000000000000000000000')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('returns the trip for its owner', async () => {
    const token = await registerUser('owner@example.com');
    const created = await request(app)
      .post('/api/trips')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'My Trip')
      .field('lat', '1')
      .field('lng', '1');

    const res = await request(app)
      .get(`/api/trips/${created.body._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('My Trip');
  });
});

describe('PUT /api/trips/:id', () => {
  it('updates a trip owned by the authenticated user', async () => {
    const token = await registerUser('owner@example.com');
    const created = await request(app)
      .post('/api/trips')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'Original Title')
      .field('lat', '1')
      .field('lng', '1');

    const res = await request(app)
      .put(`/api/trips/${created.body._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Updated Title' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated Title');
  });

  it("returns 403 when a non-owner tries to update another user's trip", async () => {
    const ownerToken = await registerUser('owner@example.com');
    const otherToken = await registerUser('other@example.com');

    const created = await request(app)
      .post('/api/trips')
      .set('Authorization', `Bearer ${ownerToken}`)
      .field('title', 'Private Trip')
      .field('lat', '1')
      .field('lng', '1');

    const res = await request(app)
      .put(`/api/trips/${created.body._id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ title: 'Hijacked Title' });

    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/trips/:id', () => {
  it('deletes a trip owned by the authenticated user', async () => {
    const token = await registerUser('owner@example.com');
    const created = await request(app)
      .post('/api/trips')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'To Delete')
      .field('lat', '1')
      .field('lng', '1');

    const res = await request(app)
      .delete(`/api/trips/${created.body._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);

    const getRes = await request(app)
      .get(`/api/trips/${created.body._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(getRes.status).toBe(404);
  });

  it("returns 403 when a non-owner tries to delete another user's trip", async () => {
    const ownerToken = await registerUser('owner@example.com');
    const otherToken = await registerUser('other@example.com');

    const created = await request(app)
      .post('/api/trips')
      .set('Authorization', `Bearer ${ownerToken}`)
      .field('title', 'Private Trip')
      .field('lat', '1')
      .field('lng', '1');

    const res = await request(app)
      .delete(`/api/trips/${created.body._id}`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.status).toBe(403);
  });
});

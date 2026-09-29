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

# Travel Log Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack MERN travel log app — JWT auth, trip CRUD with photo uploads, a Leaflet map, and public trip sharing — as a portfolio piece, deployable free-tier (Vercel + Render + Atlas).

**Architecture:** A single monorepo with `server/` (Express + Mongoose REST API, JWT auth, Multer local-disk photo uploads) and `client/` (Vite + React + Tailwind, React Router, TanStack React Query for all server state, Leaflet for maps). Backend is built and fully tested first; frontend is built against the finished API.

**Tech Stack:** Node, Express, Mongoose, MongoDB, JWT (jsonwebtoken), bcryptjs, Multer, Jest + Supertest + mongodb-memory-server (backend tests) — React, Vite, Tailwind CSS, React Router, TanStack React Query, axios, Leaflet + react-leaflet, Vitest + React Testing Library (frontend tests).

**Spec:** `docs/superpowers/specs/2026-09-26-travel-log-design.md`

## Global Constraints

- Plain JavaScript only — no TypeScript, on either client or server.
- JWT in `Authorization: Bearer <token>` header, 7-day expiry; passwords hashed with bcrypt (`bcryptjs`).
- Photos: Multer local disk storage under `server/uploads/<userId>/`; only `image/jpeg`, `image/png`, `image/webp` accepted; 5MB max per file; photos are set at trip creation only — no re-upload on edit in v1.
- Sharing: `isPublic` defaults to `false`; the public trip endpoint returns 404 uniformly whether the trip doesn't exist or exists but is private (never 403, to avoid leaking existence).
- One `{ name, lat, lng }` location per trip, set via a free-text name field plus a click-to-pin Leaflet map — no geocoding API, no multi-stop trips.
- Frontend: Vite, React, Tailwind CSS, React Router, TanStack React Query for all server-derived state.
- Map: Leaflet + OpenStreetMap tiles, no API key required.
- CORS restricted to the `CLIENT_ORIGIN` env var in production.
- No end-to-end test framework in v1 — the golden path is verified manually in the browser before a milestone is considered done.

## Review Focus

- Non-owner accessing, editing, or deleting another user's trip must get 403, not 200 or 404 — covered in Task 5 and Task 6.
- The public trip endpoint must return 404 uniformly for both "doesn't exist" and "exists but private" — covered in Task 7.
- A missing, invalid, or expired JWT on a protected route must yield 401 on the backend, and the frontend must clear the stored token and redirect to `/login` rather than showing stale/private data — covered in Task 3 (backend) and Task 8 (frontend interceptor).
- A photo upload with a disallowed MIME type or an oversized file must be rejected with 400, not crash the server or silently save it — covered in Task 4.
- Duplicate email, missing required fields on register, and a wrong password on login must yield 400/401 with a clear JSON error message, never a 500 or a raw Mongoose stack trace — covered in Task 2.

---

## File Structure

```
travel-log/
  server/
    src/
      app.js
      server.js
      middleware/
        errorHandler.js
        auth.js
        upload.js
      models/
        User.js
        Trip.js
      utils/
        jwt.js
      controllers/
        auth.controller.js
        trips.controller.js
        public.controller.js
      routes/
        auth.routes.js
        trips.routes.js
        public.routes.js
    tests/
      helpers/
        testDb.js
      health.test.js
      auth.test.js
      trips.test.js
      public.test.js
    uploads/            (gitignored, created at runtime)
    jest.config.js
    jest.setup.js
    package.json
    .env.example
  client/
    src/
      main.jsx
      App.jsx
      index.css
      api/
        client.js
        auth.js
        trips.js
        public.js
      context/
        AuthContext.jsx
      components/
        ProtectedRoute.jsx
        NavBar.jsx
        TripCard.jsx
        TripForm.jsx
        MapPicker.jsx
        TripsMap.jsx
      pages/
        LandingPage.jsx
        LoginPage.jsx
        RegisterPage.jsx
        DashboardPage.jsx
        NewTripPage.jsx
        EditTripPage.jsx
        TripDetailPage.jsx
        MapPage.jsx
        SharePage.jsx
      tests/
        setup.js
        App.test.jsx
        client.test.jsx
        ProtectedRoute.test.jsx
        LoginPage.test.jsx
        DashboardPage.test.jsx
        TripForm.test.jsx
        TripDetailPage.test.jsx
        SharePage.test.jsx
        MapPage.test.jsx
    index.html
    vite.config.js
    tailwind.config.js
    postcss.config.js
    package.json
    .env.example
  .gitignore
  README.md
```

---

### Task 1: Server scaffolding & health check

**Files:**
- Create: `server/package.json`
- Create: `server/src/middleware/errorHandler.js`
- Create: `server/src/app.js`
- Create: `server/src/server.js`
- Create: `server/jest.config.js`
- Create: `server/jest.setup.js`
- Create: `server/.env.example`
- Test: `server/tests/health.test.js`

**Interfaces:**
- Produces: `app` (Express instance, `server/src/app.js` default export) — every later backend task mounts routes onto it. `AppError` class and `notFound`/`errorHandler` middleware from `server/src/middleware/errorHandler.js`, used by every controller from Task 2 onward.

- [ ] **Step 1: Create the server package.json**

```json
{
  "name": "travel-log-server",
  "version": "1.0.0",
  "private": true,
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "test": "jest --runInBand"
  },
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "jsonwebtoken": "^9.0.2",
    "mongoose": "^8.5.0",
    "multer": "^1.4.5-lts.1"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "mongodb-memory-server": "^9.4.0",
    "nodemon": "^3.1.4",
    "supertest": "^7.0.0"
  }
}
```

Run: `cd server && npm install`

- [ ] **Step 2: Create the centralized error-handling middleware**

`server/src/middleware/errorHandler.js`:

```js
const multer = require('multer');

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

function notFound(req, res, next) {
  next(new AppError(`Route not found: ${req.originalUrl}`, 404));
}

function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Server error';

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(', ');
  } else if (err.code === 11000) {
    statusCode = 400;
    message = 'Email already registered';
  } else if (err.name === 'CastError') {
    statusCode = 404;
    message = 'Resource not found';
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Invalid or expired token';
  } else if (err instanceof multer.MulterError) {
    statusCode = 400;
    message = err.message;
  }

  if (statusCode === 500) {
    console.error(err);
  }

  res.status(statusCode).json({ error: message });
}

module.exports = { AppError, notFound, errorHandler };
```

- [ ] **Step 3: Create the Express app**

`server/src/app.js`:

```js
const express = require('express');
const cors = require('cors');
const path = require('path');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*' }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
```

- [ ] **Step 4: Create the server entrypoint**

`server/src/server.js`:

```js
require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  });
```

- [ ] **Step 5: Create Jest config and setup**

`server/jest.config.js`:

```js
module.exports = {
  testEnvironment: 'node',
  setupFiles: ['./jest.setup.js'],
};
```

`server/jest.setup.js`:

```js
process.env.JWT_SECRET = 'test-secret';
```

- [ ] **Step 6: Create the .env.example**

`server/.env.example`:

```
MONGO_URI=mongodb://localhost:27017/travel-log
JWT_SECRET=replace-with-a-long-random-string
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
```

- [ ] **Step 7: Write the failing health-check test**

`server/tests/health.test.js`:

```js
const request = require('supertest');
const app = require('../src/app');

describe('GET /api/health', () => {
  it('returns ok status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
```

- [ ] **Step 8: Run the test and verify it passes**

Run: `cd server && npx jest tests/health.test.js`
Expected: PASS (this one has no prior failing state since app.js already exists — confirm it passes now)

- [ ] **Step 9: Commit**

```bash
git add server/package.json server/package-lock.json server/src server/jest.config.js server/jest.setup.js server/.env.example server/tests/health.test.js
git commit -m "feat(server): scaffold Express app with error handling and health check"
```

---

### Task 2: User model, register & login endpoints

**Files:**
- Create: `server/src/models/User.js`
- Create: `server/src/utils/jwt.js`
- Create: `server/src/controllers/auth.controller.js`
- Create: `server/src/routes/auth.routes.js`
- Create: `server/tests/helpers/testDb.js`
- Modify: `server/src/app.js`
- Test: `server/tests/auth.test.js`
- Modify (deps): `server/package.json` (add `bcryptjs`, `jsonwebtoken` — already listed in Task 1, no change needed)
- Modify (dev deps): `server/package.json` (add `mongodb-memory-server` — already listed in Task 1)

**Interfaces:**
- Consumes: `AppError` from `server/src/middleware/errorHandler.js` (Task 1).
- Produces: `User` Mongoose model (`server/src/models/User.js`) — used by Task 3's `/me` and Task 4's trip ownership. `signToken(userId)` from `server/src/utils/jwt.js` — used by Task 3.

- [ ] **Step 1: Create the test DB helper**

`server/tests/helpers/testDb.js`:

```js
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;

async function connect() {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
}

async function clear() {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}

async function close() {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongod.stop();
}

module.exports = { connect, clear, close };
```

- [ ] **Step 2: Write the failing auth tests**

`server/tests/auth.test.js`:

```js
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

describe('POST /api/auth/register', () => {
  it('creates a new user and returns a token', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Ada',
      email: 'ada@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('ada@example.com');
  });

  it('rejects a duplicate email with 400', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Ada',
      email: 'ada@example.com',
      password: 'password123',
    });

    const res = await request(app).post('/api/auth/register').send({
      name: 'Ada Two',
      email: 'ada@example.com',
      password: 'password456',
    });

    expect(res.status).toBe(400);
  });

  it('rejects a missing password with 400', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Ada',
      email: 'ada@example.com',
    });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Ada',
      email: 'ada@example.com',
      password: 'password123',
    });
  });

  it('logs in with correct credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'ada@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('rejects an incorrect password with 401', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'ada@example.com',
      password: 'wrong-password',
    });

    expect(res.status).toBe(401);
  });

  it('rejects a nonexistent email with 401', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'nobody@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd server && npx jest tests/auth.test.js`
Expected: FAIL (`Cannot find module '../src/routes/auth.routes'` or 404s — routes don't exist yet)

- [ ] **Step 4: Create the User model**

`server/src/models/User.js`:

```js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
```

- [ ] **Step 5: Create the JWT signing helper**

`server/src/utils/jwt.js`:

```js
const jwt = require('jsonwebtoken');

function signToken(userId) {
  return jwt.sign({ sub: userId.toString() }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

module.exports = { signToken };
```

- [ ] **Step 6: Create the auth controller**

`server/src/controllers/auth.controller.js`:

```js
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { signToken } = require('../utils/jwt');
const { AppError } = require('../middleware/errorHandler');

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      throw new AppError('name, email, and password are required', 400);
    }
    if (password.length < 8) {
      throw new AppError('password must be at least 8 characters', 400);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash });

    const token = signToken(user._id);
    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      throw new AppError('email and password are required', 400);
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      throw new AppError('Invalid email or password', 401);
    }

    const token = signToken(user._id);
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login };
```

- [ ] **Step 7: Create the auth routes**

`server/src/routes/auth.routes.js`:

```js
const express = require('express');
const { register, login } = require('../controllers/auth.controller');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);

module.exports = router;
```

- [ ] **Step 8: Mount auth routes in app.js**

`server/src/app.js` (full file):

```js
const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth.routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*' }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
```

- [ ] **Step 9: Run tests to verify they pass**

Run: `cd server && npx jest tests/auth.test.js`
Expected: PASS (all 6 tests)

- [ ] **Step 10: Commit**

```bash
git add server/src server/tests server/package.json
git commit -m "feat(server): add user registration and login endpoints"
```

---

### Task 3: Auth middleware & /me endpoint

**Files:**
- Create: `server/src/middleware/auth.js`
- Modify: `server/src/controllers/auth.controller.js`
- Modify: `server/src/routes/auth.routes.js`
- Test: `server/tests/auth.test.js` (append)

**Interfaces:**
- Consumes: `AppError` (Task 1), `User` model (Task 2), `signToken` (Task 2, for test setup only).
- Produces: `requireAuth` middleware (`server/src/middleware/auth.js`) — sets `req.userId` from a valid JWT; used by Task 4's trips routes for every `/api/trips` route.

- [ ] **Step 1: Write the failing /me tests**

Append to `server/tests/auth.test.js`:

```js

describe('GET /api/auth/me', () => {
  it('rejects a request with no token with 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('rejects a request with a malformed token with 401', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });

  it('returns the current user profile for a valid token', async () => {
    const registerRes = await request(app).post('/api/auth/register').send({
      name: 'Ada',
      email: 'ada@example.com',
      password: 'password123',
    });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${registerRes.body.token}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe('ada@example.com');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && npx jest tests/auth.test.js`
Expected: FAIL (`/api/auth/me` route doesn't exist yet — 404s)

- [ ] **Step 3: Create the auth middleware**

`server/src/middleware/auth.js`:

```js
const jwt = require('jsonwebtoken');
const { AppError } = require('./errorHandler');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return next(new AppError('Authentication required', 401));
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.sub;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireAuth };
```

- [ ] **Step 4: Add the `me` controller function**

Add to `server/src/controllers/auth.controller.js` (append before `module.exports`, and update the export line):

```js
const User = require('../models/User');

async function me(req, res, next) {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    res.json({ id: user._id, name: user.name, email: user.email });
  } catch (err) {
    next(err);
  }
}
```

Update the final line to:

```js
module.exports = { register, login, me };
```

(`User` is already imported at the top of this file from Task 2 — do not add a second `require`.)

- [ ] **Step 5: Mount the /me route**

`server/src/routes/auth.routes.js` (full file):

```js
const express = require('express');
const { register, login, me } = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', requireAuth, me);

module.exports = router;
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd server && npx jest tests/auth.test.js`
Expected: PASS (all 9 tests)

- [ ] **Step 7: Commit**

```bash
git add server/src
git commit -m "feat(server): add JWT auth middleware and /api/auth/me endpoint"
```

---

### Task 4: Trip model & create-trip endpoint with photo upload

**Files:**
- Create: `server/src/models/Trip.js`
- Create: `server/src/middleware/upload.js`
- Create: `server/src/controllers/trips.controller.js`
- Create: `server/src/routes/trips.routes.js`
- Modify: `server/src/app.js`
- Test: `server/tests/trips.test.js`

**Interfaces:**
- Consumes: `AppError` (Task 1), `requireAuth` (Task 3).
- Produces: `Trip` Mongoose model (`server/src/models/Trip.js`) — used by Tasks 5, 6, 7. `upload` (Multer instance, `server/src/middleware/upload.js`) — used only in this task's create route in v1 (edit does not accept new photos).

- [ ] **Step 1: Write the failing create-trip tests**

`server/tests/trips.test.js`:

```js
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
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && npx jest tests/trips.test.js`
Expected: FAIL (`/api/trips` route doesn't exist — 404s)

- [ ] **Step 3: Create the Trip model**

`server/src/models/Trip.js`:

```js
const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    startDate: { type: Date },
    endDate: { type: Date },
    location: {
      name: { type: String, default: '' },
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    photos: { type: [String], default: [] },
    isPublic: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Trip', tripSchema);
```

- [ ] **Step 4: Create the upload middleware**

`server/src/middleware/upload.js`:

```js
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { AppError } = require('./errorHandler');

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const dir = path.join(__dirname, '..', '..', 'uploads', req.userId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    return cb(new AppError('Only jpeg, png, and webp images are allowed', 400));
  }
  cb(null, true);
}

const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_SIZE } });

module.exports = { upload };
```

**Note:** `destination` reads `req.userId`, which is set by `requireAuth` — the route must run `requireAuth` before `upload` in its middleware chain (see Step 6).

- [ ] **Step 5: Create the trips controller (create only for now)**

`server/src/controllers/trips.controller.js`:

```js
const Trip = require('../models/Trip');
const { AppError } = require('../middleware/errorHandler');

function toPhotoPaths(files, userId) {
  if (!files) return [];
  return files.map((f) => `/uploads/${userId}/${f.filename}`);
}

async function createTrip(req, res, next) {
  try {
    const { title, description, startDate, endDate, locationName, lat, lng } = req.body;
    if (!title || lat === undefined || lng === undefined) {
      throw new AppError('title, lat, and lng are required', 400);
    }

    const trip = await Trip.create({
      owner: req.userId,
      title,
      description,
      startDate,
      endDate,
      location: { name: locationName || '', lat: Number(lat), lng: Number(lng) },
      photos: toPhotoPaths(req.files, req.userId),
    });

    res.status(201).json(trip);
  } catch (err) {
    next(err);
  }
}

module.exports = { createTrip };
```

- [ ] **Step 6: Create the trips routes**

`server/src/routes/trips.routes.js`:

```js
const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { createTrip } = require('../controllers/trips.controller');

const router = express.Router();

router.use(requireAuth);

router.post('/', upload.array('photos', 5), createTrip);

module.exports = router;
```

- [ ] **Step 7: Mount trips routes in app.js**

`server/src/app.js` (full file):

```js
const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth.routes');
const tripsRoutes = require('./routes/trips.routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*' }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/trips', tripsRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `cd server && npx jest tests/trips.test.js`
Expected: PASS (all 5 tests)

- [ ] **Step 9: Commit**

```bash
git add server/src server/tests/trips.test.js
git commit -m "feat(server): add trip model and create-trip endpoint with photo upload"
```

---

### Task 5: List trips & get single trip (ownership enforcement)

**Files:**
- Modify: `server/src/controllers/trips.controller.js`
- Modify: `server/src/routes/trips.routes.js`
- Test: `server/tests/trips.test.js` (append)

**Interfaces:**
- Consumes: `Trip` model (Task 4).
- Produces: `assertOwner(trip, userId)` helper in `trips.controller.js` — reused by Task 6's update/delete.

- [ ] **Step 1: Write the failing list/get tests**

Append to `server/tests/trips.test.js`:

```js

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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && npx jest tests/trips.test.js`
Expected: FAIL (`GET /api/trips` and `GET /api/trips/:id` return 404 — routes don't exist yet)

- [ ] **Step 3: Add listTrips, getTrip, and assertOwner to the controller**

Add to `server/src/controllers/trips.controller.js` (after `toPhotoPaths`, before `module.exports`):

```js

function assertOwner(trip, userId) {
  if (trip.owner.toString() !== userId) {
    throw new AppError('You do not have access to this trip', 403);
  }
}

async function listTrips(req, res, next) {
  try {
    const trips = await Trip.find({ owner: req.userId }).sort({ createdAt: -1 });
    res.json(trips);
  } catch (err) {
    next(err);
  }
}

async function getTrip(req, res, next) {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      throw new AppError('Trip not found', 404);
    }
    assertOwner(trip, req.userId);
    res.json(trip);
  } catch (err) {
    next(err);
  }
}
```

Update the final line to:

```js
module.exports = { createTrip, listTrips, getTrip, assertOwner };
```

- [ ] **Step 4: Mount the new routes**

`server/src/routes/trips.routes.js` (full file):

```js
const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { createTrip, listTrips, getTrip } = require('../controllers/trips.controller');

const router = express.Router();

router.use(requireAuth);

router.post('/', upload.array('photos', 5), createTrip);
router.get('/', listTrips);
router.get('/:id', getTrip);

module.exports = router;
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd server && npx jest tests/trips.test.js`
Expected: PASS (all 9 tests)

- [ ] **Step 6: Commit**

```bash
git add server/src
git commit -m "feat(server): add list and get-single trip endpoints with ownership checks"
```

---

### Task 6: Update & delete trip (ownership enforcement)

**Files:**
- Modify: `server/src/controllers/trips.controller.js`
- Modify: `server/src/routes/trips.routes.js`
- Test: `server/tests/trips.test.js` (append)

**Interfaces:**
- Consumes: `Trip` model (Task 4), `assertOwner` (Task 5).
- Produces: nothing new consumed by later tasks (frontend calls these via `PUT`/`DELETE /api/trips/:id`).

- [ ] **Step 1: Write the failing update/delete tests**

Append to `server/tests/trips.test.js`:

```js

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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && npx jest tests/trips.test.js`
Expected: FAIL (PUT/DELETE routes don't exist — 404s)

- [ ] **Step 3: Add updateTrip and deleteTrip to the controller**

Add to `server/src/controllers/trips.controller.js` (before `module.exports`):

```js

async function updateTrip(req, res, next) {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      throw new AppError('Trip not found', 404);
    }
    assertOwner(trip, req.userId);

    const { title, description, startDate, endDate, locationName, lat, lng, isPublic } = req.body;
    if (title !== undefined) trip.title = title;
    if (description !== undefined) trip.description = description;
    if (startDate !== undefined) trip.startDate = startDate;
    if (endDate !== undefined) trip.endDate = endDate;
    if (locationName !== undefined) trip.location.name = locationName;
    if (lat !== undefined) trip.location.lat = Number(lat);
    if (lng !== undefined) trip.location.lng = Number(lng);
    if (isPublic !== undefined) trip.isPublic = isPublic === 'true' || isPublic === true;

    await trip.save();
    res.json(trip);
  } catch (err) {
    next(err);
  }
}

async function deleteTrip(req, res, next) {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      throw new AppError('Trip not found', 404);
    }
    assertOwner(trip, req.userId);
    await trip.deleteOne();
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
```

Update the final line to:

```js
module.exports = { createTrip, listTrips, getTrip, updateTrip, deleteTrip, assertOwner };
```

- [ ] **Step 4: Mount the new routes**

`server/src/routes/trips.routes.js` (full file):

```js
const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const {
  createTrip,
  listTrips,
  getTrip,
  updateTrip,
  deleteTrip,
} = require('../controllers/trips.controller');

const router = express.Router();

router.use(requireAuth);

router.post('/', upload.array('photos', 5), createTrip);
router.get('/', listTrips);
router.get('/:id', getTrip);
router.put('/:id', updateTrip);
router.delete('/:id', deleteTrip);

module.exports = router;
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd server && npx jest tests/trips.test.js`
Expected: PASS (all 13 tests)

- [ ] **Step 6: Commit**

```bash
git add server/src
git commit -m "feat(server): add update and delete trip endpoints with ownership checks"
```

---

### Task 7: Public trip endpoint

**Files:**
- Create: `server/src/controllers/public.controller.js`
- Create: `server/src/routes/public.routes.js`
- Modify: `server/src/app.js`
- Test: `server/tests/public.test.js`

**Interfaces:**
- Consumes: `Trip` model (Task 4), `AppError` (Task 1).
- Produces: `GET /api/public/trips/:id` — consumed by the frontend's Task 13 (`SharePage`).

- [ ] **Step 1: Write the failing public-trip tests**

`server/tests/public.test.js`:

```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && npx jest tests/public.test.js`
Expected: FAIL (`/api/public/trips/:id` route doesn't exist — 404 for all, including the "should be 200" case)

- [ ] **Step 3: Create the public controller**

`server/src/controllers/public.controller.js`:

```js
const Trip = require('../models/Trip');
const { AppError } = require('../middleware/errorHandler');

async function getPublicTrip(req, res, next) {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip || !trip.isPublic) {
      throw new AppError('Trip not found', 404);
    }
    res.json(trip);
  } catch (err) {
    next(err);
  }
}

module.exports = { getPublicTrip };
```

- [ ] **Step 4: Create the public routes**

`server/src/routes/public.routes.js`:

```js
const express = require('express');
const { getPublicTrip } = require('../controllers/public.controller');

const router = express.Router();

router.get('/trips/:id', getPublicTrip);

module.exports = router;
```

- [ ] **Step 5: Mount public routes in app.js**

`server/src/app.js` (full file):

```js
const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth.routes');
const tripsRoutes = require('./routes/trips.routes');
const publicRoutes = require('./routes/public.routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*' }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/trips', tripsRoutes);
app.use('/api/public', publicRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd server && npx jest tests/public.test.js`
Expected: PASS (all 4 tests)

- [ ] **Step 7: Run the full backend test suite**

Run: `cd server && npm test`
Expected: PASS (all backend tests across health/auth/trips/public)

- [ ] **Step 8: Commit**

```bash
git add server/src server/tests/public.test.js
git commit -m "feat(server): add public read-only trip endpoint"
```

This completes the backend. The API is fully testable and functional standalone at this point (e.g. via curl or Postman) before any frontend work begins.

---

### Task 8: Client scaffolding (Vite + Tailwind + Router + React Query + API client)

**Files:**
- Create: `client/package.json`
- Create: `client/vite.config.js`
- Create: `client/tailwind.config.js`
- Create: `client/postcss.config.js`
- Create: `client/index.html`
- Create: `client/src/index.css`
- Create: `client/src/api/client.js`
- Create: `client/src/main.jsx`
- Create: `client/src/App.jsx`
- Create: `client/src/pages/LandingPage.jsx`
- Create: `client/src/tests/setup.js`
- Create: `client/.env.example`
- Test: `client/src/tests/App.test.jsx`
- Test: `client/src/tests/client.test.jsx`

**Interfaces:**
- Produces: `client` (default-exported axios instance, `client/src/api/client.js`) — used by every later `api/*.js` module. `handleResponseError` (named export from the same file) — tested directly here.

- [ ] **Step 1: Create the client package.json**

```json
{
  "name": "travel-log-client",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "@tanstack/react-query": "^5.51.0",
    "axios": "^1.7.2",
    "leaflet": "^1.9.4",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-leaflet": "^4.2.1",
    "react-router-dom": "^6.24.1"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.6",
    "@testing-library/react": "^16.0.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.19",
    "jsdom": "^24.1.0",
    "postcss": "^8.4.39",
    "tailwindcss": "^3.4.6",
    "vite": "^5.3.3",
    "vitest": "^2.0.2"
  }
}
```

Run: `cd client && npm install`

- [ ] **Step 2: Create Vite config with Vitest settings**

`client/vite.config.js`:

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/tests/setup.js',
  },
});
```

- [ ] **Step 3: Create Tailwind and PostCSS config**

`client/tailwind.config.js`:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: { extend: {} },
  plugins: [],
};
```

`client/postcss.config.js`:

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 4: Create index.html and index.css**

`client/index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Travel Log</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

`client/src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 5: Create the Vitest setup file**

`client/src/tests/setup.js`:

```js
import '@testing-library/jest-dom';
```

- [ ] **Step 6: Write the failing API client test**

`client/src/tests/client.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleResponseError } from '../api/client.js';

describe('handleResponseError', () => {
  beforeEach(() => {
    localStorage.clear();
    delete window.location;
    window.location = { assign: vi.fn() };
  });

  it('clears the stored token and redirects to /login on a 401', async () => {
    localStorage.setItem('token', 'stale-token');

    await expect(handleResponseError({ response: { status: 401 } })).rejects.toBeDefined();

    expect(localStorage.getItem('token')).toBeNull();
    expect(window.location.assign).toHaveBeenCalledWith('/login');
  });

  it('leaves the token alone for non-401 errors', async () => {
    localStorage.setItem('token', 'valid-token');

    await expect(handleResponseError({ response: { status: 500 } })).rejects.toBeDefined();

    expect(localStorage.getItem('token')).toBe('valid-token');
  });
});
```

- [ ] **Step 7: Write the failing App smoke test**

`client/src/tests/App.test.jsx`:

```jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '../App.jsx';

function renderApp() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

describe('App', () => {
  it('renders the landing page heading', () => {
    renderApp();
    expect(screen.getByText('Travel Log')).toBeInTheDocument();
  });
});
```

- [ ] **Step 8: Run tests to verify they fail**

Run: `cd client && npx vitest run`
Expected: FAIL (`../api/client.js` and `../App.jsx` don't exist yet)

- [ ] **Step 9: Create the API client**

`client/src/api/client.js`:

```js
import axios from 'axios';

export function handleResponseError(error) {
  if (error.response && error.response.status === 401) {
    localStorage.removeItem('token');
    window.location.assign('/login');
  }
  return Promise.reject(error);
}

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use((response) => response, handleResponseError);

export default client;
```

- [ ] **Step 10: Create the landing page**

`client/src/pages/LandingPage.jsx`:

```jsx
function LandingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <h1 className="text-3xl font-bold">Travel Log</h1>
    </div>
  );
}

export default LandingPage;
```

- [ ] **Step 11: Create App.jsx**

`client/src/App.jsx`:

```jsx
import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage.jsx';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
    </Routes>
  );
}

export default App;
```

- [ ] **Step 12: Create main.jsx**

`client/src/main.jsx`:

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.jsx';
import './index.css';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
```

- [ ] **Step 13: Create the .env.example**

`client/.env.example`:

```
VITE_API_URL=http://localhost:5000
```

- [ ] **Step 14: Run tests to verify they pass**

Run: `cd client && npx vitest run`
Expected: PASS (3 tests across both files)

- [ ] **Step 15: Commit**

```bash
git add client/package.json client/package-lock.json client/vite.config.js client/tailwind.config.js client/postcss.config.js client/index.html client/src client/.env.example
git commit -m "feat(client): scaffold Vite + React + Tailwind app with API client"
```

---

### Task 9: Auth context, login/register pages, protected routes

**Files:**
- Create: `client/src/api/auth.js`
- Create: `client/src/context/AuthContext.jsx`
- Create: `client/src/components/ProtectedRoute.jsx`
- Create: `client/src/pages/LoginPage.jsx`
- Create: `client/src/pages/RegisterPage.jsx`
- Create: `client/src/pages/DashboardPage.jsx`
- Modify: `client/src/App.jsx`
- Modify: `client/src/main.jsx`
- Test: `client/src/tests/ProtectedRoute.test.jsx`
- Test: `client/src/tests/LoginPage.test.jsx`

**Interfaces:**
- Consumes: `client` (Task 8) for HTTP calls.
- Produces: `useAuth()` hook and `AuthProvider` (`client/src/context/AuthContext.jsx`) — consumed by every page/component from Task 10 onward that needs `user`, `isAuthenticated`, or `logout`. `ProtectedRoute` — consumed by `App.jsx` from this task onward for every authenticated route.

- [ ] **Step 1: Create the auth API module**

`client/src/api/auth.js`:

```js
import client from './client.js';

export async function register({ name, email, password }) {
  const res = await client.post('/api/auth/register', { name, email, password });
  return res.data;
}

export async function login({ email, password }) {
  const res = await client.post('/api/auth/login', { email, password });
  return res.data;
}

export async function fetchMe() {
  const res = await client.get('/api/auth/me');
  return res.data;
}
```

- [ ] **Step 2: Write the failing ProtectedRoute test**

`client/src/tests/ProtectedRoute.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute.jsx';
import { useAuth } from '../context/AuthContext.jsx';

vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: vi.fn(),
}));

function renderWithRoute(initialEntry) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <div>Dashboard Page</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  it('redirects to /login when not authenticated', () => {
    useAuth.mockReturnValue({ isAuthenticated: false, isLoading: false });
    renderWithRoute('/dashboard');
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('renders children when authenticated', () => {
    useAuth.mockReturnValue({ isAuthenticated: true, isLoading: false });
    renderWithRoute('/dashboard');
    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Write the failing LoginPage test**

`client/src/tests/LoginPage.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from '../pages/LoginPage.jsx';
import * as authApi from '../api/auth.js';
import { useAuth } from '../context/AuthContext.jsx';

vi.mock('../api/auth.js');
vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: vi.fn(),
}));

describe('LoginPage', () => {
  it('shows an error message when login fails', async () => {
    useAuth.mockReturnValue({ loginWithToken: vi.fn() });
    authApi.login.mockRejectedValue({
      response: { data: { error: 'Invalid email or password' } },
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('Email'), {
      target: { value: 'ada@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'wrong-password' },
    });
    fireEvent.click(screen.getByText('Log in'));

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
    });
  });

  it('calls loginWithToken and navigates on success', async () => {
    const loginWithToken = vi.fn();
    useAuth.mockReturnValue({ loginWithToken });
    authApi.login.mockResolvedValue({ token: 'fake-token' });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('Email'), {
      target: { value: 'ada@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByText('Log in'));

    await waitFor(() => {
      expect(loginWithToken).toHaveBeenCalledWith('fake-token');
    });
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `cd client && npx vitest run src/tests/ProtectedRoute.test.jsx src/tests/LoginPage.test.jsx`
Expected: FAIL (`../components/ProtectedRoute.jsx`, `../context/AuthContext.jsx`, `../pages/LoginPage.jsx` don't exist)

- [ ] **Step 5: Create AuthContext**

`client/src/context/AuthContext.jsx`:

```jsx
import { createContext, useContext, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchMe } from '../api/auth.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
    enabled: Boolean(token),
    retry: false,
  });

  function loginWithToken(newToken) {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    queryClient.invalidateQueries({ queryKey: ['me'] });
  }

  function logout() {
    localStorage.removeItem('token');
    setToken(null);
    queryClient.removeQueries({ queryKey: ['me'] });
  }

  const value = {
    token,
    user,
    isAuthenticated: Boolean(token),
    isLoading: Boolean(token) && isLoading,
    loginWithToken,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
```

- [ ] **Step 6: Create ProtectedRoute**

`client/src/components/ProtectedRoute.jsx`:

```jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
```

- [ ] **Step 7: Create LoginPage**

`client/src/pages/LoginPage.jsx`:

```jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../api/auth.js';
import { useAuth } from '../context/AuthContext.jsx';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const { token } = await login({ email, password });
      loginWithToken(token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-16 p-6">
      <h1 className="text-2xl font-bold mb-4">Log in</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded px-3 py-2"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border rounded px-3 py-2"
          required
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button type="submit" className="w-full bg-blue-600 text-white rounded py-2">
          Log in
        </button>
      </form>
      <p className="mt-4 text-sm">
        No account?{' '}
        <Link to="/register" className="text-blue-600">
          Register
        </Link>
      </p>
    </div>
  );
}

export default LoginPage;
```

- [ ] **Step 8: Create RegisterPage**

`client/src/pages/RegisterPage.jsx`:

```jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../api/auth.js';
import { useAuth } from '../context/AuthContext.jsx';

function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const { token } = await register({ name, email, password });
      loginWithToken(token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-16 p-6">
      <h1 className="text-2xl font-bold mb-4">Register</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border rounded px-3 py-2"
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded px-3 py-2"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border rounded px-3 py-2"
          required
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button type="submit" className="w-full bg-blue-600 text-white rounded py-2">
          Create account
        </button>
      </form>
      <p className="mt-4 text-sm">
        Already have an account?{' '}
        <Link to="/login" className="text-blue-600">
          Log in
        </Link>
      </p>
    </div>
  );
}

export default RegisterPage;
```

- [ ] **Step 9: Create a minimal DashboardPage placeholder (fully built in Task 10)**

`client/src/pages/DashboardPage.jsx`:

```jsx
import { useAuth } from '../context/AuthContext.jsx';

function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold">Welcome{user ? `, ${user.name}` : ''}</h1>
      <button onClick={logout} className="text-gray-600 mt-4">
        Log out
      </button>
    </div>
  );
}

export default DashboardPage;
```

- [ ] **Step 10: Wire AuthProvider into main.jsx**

`client/src/main.jsx` (full file):

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import './index.css';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
```

- [ ] **Step 11: Add the new routes to App.jsx**

`client/src/App.jsx` (full file):

```jsx
import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
```

- [ ] **Step 12: Run tests to verify they pass**

Run: `cd client && npx vitest run`
Expected: PASS (App.test.jsx still passes since `/` is unaffected; ProtectedRoute and LoginPage tests now pass too)

- [ ] **Step 13: Commit**

```bash
git add client/src
git commit -m "feat(client): add auth context, login/register pages, and protected routes"
```

---

### Task 10: Dashboard trip list

**Files:**
- Create: `client/src/api/trips.js`
- Create: `client/src/components/TripCard.jsx`
- Modify: `client/src/pages/DashboardPage.jsx`
- Test: `client/src/tests/DashboardPage.test.jsx`

**Interfaces:**
- Consumes: `client` (Task 8), `useAuth` (Task 9).
- Produces: `fetchTrips`, `fetchTrip`, `createTrip`, `updateTrip`, `deleteTrip` (`client/src/api/trips.js`) — consumed by Tasks 11, 12, 14.

- [ ] **Step 1: Write the failing DashboardPage test**

`client/src/tests/DashboardPage.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DashboardPage from '../pages/DashboardPage.jsx';
import * as tripsApi from '../api/trips.js';
import { useAuth } from '../context/AuthContext.jsx';

vi.mock('../api/trips.js');
vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: vi.fn(),
}));

function renderDashboard() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('DashboardPage', () => {
  it('renders a card for each trip', async () => {
    useAuth.mockReturnValue({ user: { name: 'Ada' }, logout: vi.fn() });
    tripsApi.fetchTrips.mockResolvedValue([
      { _id: '1', title: 'Lisbon', location: { name: 'Lisbon' }, photos: [] },
      { _id: '2', title: 'Tokyo', location: { name: 'Tokyo' }, photos: [] },
    ]);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Lisbon')).toBeInTheDocument();
      expect(screen.getByText('Tokyo')).toBeInTheDocument();
    });
  });

  it('shows an empty state when there are no trips', async () => {
    useAuth.mockReturnValue({ user: { name: 'Ada' }, logout: vi.fn() });
    tripsApi.fetchTrips.mockResolvedValue([]);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('No trips yet. Create your first one!')).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd client && npx vitest run src/tests/DashboardPage.test.jsx`
Expected: FAIL (`../api/trips.js` doesn't exist; DashboardPage doesn't render trip cards yet)

- [ ] **Step 3: Create the trips API module**

`client/src/api/trips.js`:

```js
import client from './client.js';

export async function fetchTrips() {
  const res = await client.get('/api/trips');
  return res.data;
}

export async function fetchTrip(id) {
  const res = await client.get(`/api/trips/${id}`);
  return res.data;
}

export async function createTrip(formData) {
  const res = await client.post('/api/trips', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function updateTrip(id, data) {
  const res = await client.put(`/api/trips/${id}`, data);
  return res.data;
}

export async function deleteTrip(id) {
  await client.delete(`/api/trips/${id}`);
}
```

- [ ] **Step 4: Create TripCard**

`client/src/components/TripCard.jsx`:

```jsx
import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function TripCard({ trip }) {
  return (
    <Link
      to={`/trips/${trip._id}`}
      className="block border rounded-lg overflow-hidden hover:shadow-md transition"
    >
      {trip.photos.length > 0 && (
        <img
          src={`${API_URL}${trip.photos[0]}`}
          alt={trip.title}
          className="w-full h-40 object-cover"
        />
      )}
      <div className="p-4">
        <h3 className="font-semibold text-lg">{trip.title}</h3>
        <p className="text-sm text-gray-600">{trip.location.name}</p>
      </div>
    </Link>
  );
}

export default TripCard;
```

- [ ] **Step 5: Rewrite DashboardPage to list trips**

`client/src/pages/DashboardPage.jsx` (full file):

```jsx
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchTrips } from '../api/trips.js';
import TripCard from '../components/TripCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';

function DashboardPage() {
  const { user, logout } = useAuth();
  const {
    data: trips,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['trips'],
    queryFn: fetchTrips,
  });

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Welcome{user ? `, ${user.name}` : ''}</h1>
        <div className="space-x-4">
          <Link to="/trips/new" className="bg-blue-600 text-white px-4 py-2 rounded">
            New trip
          </Link>
          <button onClick={logout} className="text-gray-600">
            Log out
          </button>
        </div>
      </div>

      {isLoading && <p>Loading trips...</p>}
      {isError && <p className="text-red-600">Failed to load trips.</p>}
      {trips && trips.length === 0 && <p>No trips yet. Create your first one!</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {trips?.map((trip) => (
          <TripCard key={trip._id} trip={trip} />
        ))}
      </div>
    </div>
  );
}

export default DashboardPage;
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd client && npx vitest run src/tests/DashboardPage.test.jsx`
Expected: PASS (both tests)

- [ ] **Step 7: Commit**

```bash
git add client/src
git commit -m "feat(client): add trip list dashboard"
```

---

### Task 11: Trip editor (map picker + form + create flow)

**Files:**
- Create: `client/src/components/MapPicker.jsx`
- Create: `client/src/components/TripForm.jsx`
- Create: `client/src/pages/NewTripPage.jsx`
- Modify: `client/src/App.jsx`
- Test: `client/src/tests/TripForm.test.jsx`

**Interfaces:**
- Consumes: `createTrip` (Task 10).
- Produces: `TripForm` component, with props `initialValues`, `onSubmit`, `submitLabel`, `allowPhotoUpload` (default `true`) — reused by Task 12's `EditTripPage` with `allowPhotoUpload={false}`.

- [ ] **Step 1: Write the failing TripForm test**

`client/src/tests/TripForm.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TripForm from '../components/TripForm.jsx';

vi.mock('../components/MapPicker.jsx', () => ({
  default: ({ onPick }) => <button onClick={() => onPick({ lat: 10, lng: 20 })}>Mock Map</button>,
}));

describe('TripForm', () => {
  it('shows a validation error when submitting without a title or pin', () => {
    const onSubmit = vi.fn();
    render(<TripForm onSubmit={onSubmit} submitLabel="Create trip" />);

    fireEvent.click(screen.getByText('Create trip'));

    expect(screen.getByText('Title and a map location are required.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits form data once title and location are set', () => {
    const onSubmit = vi.fn();
    render(<TripForm onSubmit={onSubmit} submitLabel="Create trip" />);

    fireEvent.change(screen.getByPlaceholderText('Trip title'), {
      target: { value: 'Lisbon Trip' },
    });
    fireEvent.click(screen.getByText('Mock Map'));
    fireEvent.click(screen.getByText('Create trip'));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const formData = onSubmit.mock.calls[0][0];
    expect(formData.get('title')).toBe('Lisbon Trip');
    expect(formData.get('lat')).toBe('10');
  });

  it('omits the photo input when allowPhotoUpload is false', () => {
    render(<TripForm onSubmit={vi.fn()} submitLabel="Save changes" allowPhotoUpload={false} />);
    expect(screen.queryByLabelText(/photos/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd client && npx vitest run src/tests/TripForm.test.jsx`
Expected: FAIL (`../components/TripForm.jsx` doesn't exist)

- [ ] **Step 3: Create MapPicker**

`client/src/components/MapPicker.jsx`:

```jsx
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng);
    },
  });
  return null;
}

function MapPicker({ lat, lng, onPick }) {
  const center = lat && lng ? [lat, lng] : [20, 0];
  const zoom = lat && lng ? 8 : 2;

  return (
    <MapContainer center={center} zoom={zoom} style={{ height: '300px', width: '100%' }}>
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onPick={onPick} />
      {lat && lng && <Marker position={[lat, lng]} icon={markerIcon} />}
    </MapContainer>
  );
}

export default MapPicker;
```

- [ ] **Step 4: Create TripForm**

`client/src/components/TripForm.jsx`:

```jsx
import { useState } from 'react';
import MapPicker from './MapPicker.jsx';

function TripForm({ initialValues, onSubmit, submitLabel, allowPhotoUpload = true }) {
  const [title, setTitle] = useState(initialValues?.title || '');
  const [description, setDescription] = useState(initialValues?.description || '');
  const [startDate, setStartDate] = useState(initialValues?.startDate?.slice(0, 10) || '');
  const [endDate, setEndDate] = useState(initialValues?.endDate?.slice(0, 10) || '');
  const [locationName, setLocationName] = useState(initialValues?.location?.name || '');
  const [lat, setLat] = useState(initialValues?.location?.lat ?? null);
  const [lng, setLng] = useState(initialValues?.location?.lng ?? null);
  const [photos, setPhotos] = useState([]);
  const [error, setError] = useState('');

  function handlePick(latlng) {
    setLat(latlng.lat);
    setLng(latlng.lng);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!title || lat === null || lng === null) {
      setError('Title and a map location are required.');
      return;
    }
    setError('');

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('startDate', startDate);
    formData.append('endDate', endDate);
    formData.append('locationName', locationName);
    formData.append('lat', lat);
    formData.append('lng', lng);
    if (allowPhotoUpload) {
      photos.forEach((file) => formData.append('photos', file));
    }

    onSubmit(formData);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
      <input
        type="text"
        placeholder="Trip title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full border rounded px-3 py-2"
      />
      <textarea
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full border rounded px-3 py-2"
        rows={4}
      />
      <div className="flex gap-4">
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="border rounded px-3 py-2"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="border rounded px-3 py-2"
        />
      </div>
      <input
        type="text"
        placeholder="Location name (e.g. Lisbon, Portugal)"
        value={locationName}
        onChange={(e) => setLocationName(e.target.value)}
        className="w-full border rounded px-3 py-2"
      />
      <p className="text-sm text-gray-600">Click the map to drop a pin:</p>
      <MapPicker lat={lat} lng={lng} onPick={handlePick} />
      {allowPhotoUpload && (
        <input
          aria-label="photos"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setPhotos(Array.from(e.target.files))}
        />
      )}
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button type="submit" className="bg-blue-600 text-white rounded px-4 py-2">
        {submitLabel}
      </button>
    </form>
  );
}

export default TripForm;
```

- [ ] **Step 5: Create NewTripPage**

`client/src/pages/NewTripPage.jsx`:

```jsx
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import TripForm from '../components/TripForm.jsx';
import { createTrip } from '../api/trips.js';

function NewTripPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createTrip,
    onSuccess: (trip) => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      navigate(`/trips/${trip._id}`);
    },
  });

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">New trip</h1>
      <TripForm onSubmit={(formData) => mutation.mutate(formData)} submitLabel="Create trip" />
      {mutation.isError && <p className="text-red-600 mt-2">Failed to create trip.</p>}
    </div>
  );
}

export default NewTripPage;
```

- [ ] **Step 6: Add the /trips/new route**

`client/src/App.jsx` (full file):

```jsx
import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import NewTripPage from './pages/NewTripPage.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/trips/new"
        element={
          <ProtectedRoute>
            <NewTripPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
```

- [ ] **Step 7: Run test to verify it passes**

Run: `cd client && npx vitest run src/tests/TripForm.test.jsx`
Expected: PASS (all 3 tests)

- [ ] **Step 8: Commit**

```bash
git add client/src
git commit -m "feat(client): add map pin picker and trip creation flow"
```

---

### Task 12: Trip detail page & edit flow

**Files:**
- Create: `client/src/pages/TripDetailPage.jsx`
- Create: `client/src/pages/EditTripPage.jsx`
- Modify: `client/src/App.jsx`
- Test: `client/src/tests/TripDetailPage.test.jsx`

**Interfaces:**
- Consumes: `fetchTrip`, `deleteTrip`, `updateTrip` (Task 10), `TripForm` (Task 11), `useAuth` (Task 9).

- [ ] **Step 1: Write the failing TripDetailPage test**

`client/src/tests/TripDetailPage.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TripDetailPage from '../pages/TripDetailPage.jsx';
import * as tripsApi from '../api/trips.js';
import { useAuth } from '../context/AuthContext.jsx';

vi.mock('../api/trips.js');
vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: vi.fn(),
}));

function renderDetail() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/trips/1']}>
        <Routes>
          <Route path="/trips/:id" element={<TripDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const sampleTrip = {
  _id: '1',
  title: 'Lisbon Trip',
  description: 'Great food',
  location: { name: 'Lisbon' },
  photos: [],
  isPublic: false,
  owner: 'owner-id',
};

describe('TripDetailPage', () => {
  it('shows owner controls when the current user owns the trip', async () => {
    tripsApi.fetchTrip.mockResolvedValue(sampleTrip);
    useAuth.mockReturnValue({ user: { id: 'owner-id' } });

    renderDetail();

    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });
  });

  it('hides owner controls for a non-owner', async () => {
    tripsApi.fetchTrip.mockResolvedValue(sampleTrip);
    useAuth.mockReturnValue({ user: { id: 'someone-else' } });

    renderDetail();

    await waitFor(() => {
      expect(screen.getByText('Lisbon Trip')).toBeInTheDocument();
    });
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd client && npx vitest run src/tests/TripDetailPage.test.jsx`
Expected: FAIL (`../pages/TripDetailPage.jsx` doesn't exist)

- [ ] **Step 3: Create TripDetailPage**

`client/src/pages/TripDetailPage.jsx`:

```jsx
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTrip, deleteTrip, updateTrip } from '../api/trips.js';
import { useAuth } from '../context/AuthContext.jsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function TripDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const {
    data: trip,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['trips', id],
    queryFn: () => fetchTrip(id),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteTrip(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      navigate('/dashboard');
    },
  });

  const shareMutation = useMutation({
    mutationFn: (isPublic) => updateTrip(id, { isPublic }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['trips', id], updated);
    },
  });

  if (isLoading) return <p className="p-6">Loading...</p>;
  if (isError || !trip) return <p className="p-6 text-red-600">Trip not found.</p>;

  const isOwner = user && trip.owner === user.id;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold">{trip.title}</h1>
      <p className="text-gray-600">{trip.location.name}</p>
      <p className="mt-4">{trip.description}</p>

      <div className="flex flex-wrap gap-2 mt-4">
        {trip.photos.map((photo) => (
          <img
            key={photo}
            src={`${API_URL}${photo}`}
            alt={trip.title}
            className="w-40 h-40 object-cover rounded"
          />
        ))}
      </div>

      {isOwner && (
        <div className="mt-6 space-x-4">
          <Link to={`/trips/${id}/edit`} className="text-blue-600">
            Edit
          </Link>
          <button onClick={() => deleteMutation.mutate()} className="text-red-600">
            Delete
          </button>
          <button onClick={() => shareMutation.mutate(!trip.isPublic)} className="text-gray-700">
            {trip.isPublic ? 'Make private' : 'Make public'}
          </button>
          {trip.isPublic && (
            <span className="block mt-2 text-sm text-gray-600">
              Shareable link: {window.location.origin}/share/{trip._id}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default TripDetailPage;
```

- [ ] **Step 4: Create EditTripPage**

`client/src/pages/EditTripPage.jsx`:

```jsx
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import TripForm from '../components/TripForm.jsx';
import { fetchTrip, updateTrip } from '../api/trips.js';

function EditTripPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: trip, isLoading } = useQuery({
    queryKey: ['trips', id],
    queryFn: () => fetchTrip(id),
  });

  const mutation = useMutation({
    mutationFn: (formData) => updateTrip(id, Object.fromEntries(formData.entries())),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['trips', id] });
      navigate(`/trips/${id}`);
    },
  });

  if (isLoading) return <p className="p-6">Loading...</p>;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Edit trip</h1>
      <TripForm
        initialValues={trip}
        onSubmit={(formData) => mutation.mutate(formData)}
        submitLabel="Save changes"
        allowPhotoUpload={false}
      />
    </div>
  );
}

export default EditTripPage;
```

**Note:** `allowPhotoUpload={false}` guarantees `TripForm`'s `FormData` never contains a `File` entry here, so `Object.fromEntries(formData.entries())` is safe to send as a plain JSON body.

- [ ] **Step 5: Add the new routes**

`client/src/App.jsx` (full file):

```jsx
import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import NewTripPage from './pages/NewTripPage.jsx';
import TripDetailPage from './pages/TripDetailPage.jsx';
import EditTripPage from './pages/EditTripPage.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/trips/new"
        element={
          <ProtectedRoute>
            <NewTripPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/trips/:id/edit"
        element={
          <ProtectedRoute>
            <EditTripPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/trips/:id"
        element={
          <ProtectedRoute>
            <TripDetailPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
```

**Note:** `/trips/:id/edit` must be listed before `/trips/:id` — React Router matches in order, and the more specific path needs to win.

- [ ] **Step 6: Run test to verify it passes**

Run: `cd client && npx vitest run src/tests/TripDetailPage.test.jsx`
Expected: PASS (both tests)

- [ ] **Step 7: Commit**

```bash
git add client/src
git commit -m "feat(client): add trip detail page with edit, delete, and share controls"
```

---

### Task 13: Public share page

**Files:**
- Create: `client/src/api/public.js`
- Create: `client/src/pages/SharePage.jsx`
- Modify: `client/src/App.jsx`
- Test: `client/src/tests/SharePage.test.jsx`

**Interfaces:**
- Consumes: `client` (Task 8).
- Produces: `fetchPublicTrip` (`client/src/api/public.js`).

- [ ] **Step 1: Write the failing SharePage test**

`client/src/tests/SharePage.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SharePage from '../pages/SharePage.jsx';
import * as publicApi from '../api/public.js';

vi.mock('../api/public.js');

function renderShare() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/share/1']}>
        <Routes>
          <Route path="/share/:id" element={<SharePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('SharePage', () => {
  it('renders a public trip', async () => {
    publicApi.fetchPublicTrip.mockResolvedValue({
      _id: '1',
      title: 'Lisbon Trip',
      description: 'Great food',
      location: { name: 'Lisbon' },
      photos: [],
    });

    renderShare();

    await waitFor(() => {
      expect(screen.getByText('Lisbon Trip')).toBeInTheDocument();
    });
  });

  it('shows a not-available message when the trip is private or missing', async () => {
    publicApi.fetchPublicTrip.mockRejectedValue({ response: { status: 404 } });

    renderShare();

    await waitFor(() => {
      expect(screen.getByText("This trip isn't available.")).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd client && npx vitest run src/tests/SharePage.test.jsx`
Expected: FAIL (`../api/public.js` and `../pages/SharePage.jsx` don't exist)

- [ ] **Step 3: Create the public API module**

`client/src/api/public.js`:

```js
import client from './client.js';

export async function fetchPublicTrip(id) {
  const res = await client.get(`/api/public/trips/${id}`);
  return res.data;
}
```

- [ ] **Step 4: Create SharePage**

`client/src/pages/SharePage.jsx`:

```jsx
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchPublicTrip } from '../api/public.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function SharePage() {
  const { id } = useParams();

  const {
    data: trip,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['public-trip', id],
    queryFn: () => fetchPublicTrip(id),
    retry: false,
  });

  if (isLoading) return <p className="p-6">Loading...</p>;
  if (isError || !trip) {
    return <p className="p-6 text-red-600">This trip isn't available.</p>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold">{trip.title}</h1>
      <p className="text-gray-600">{trip.location.name}</p>
      <p className="mt-4">{trip.description}</p>
      <div className="flex flex-wrap gap-2 mt-4">
        {trip.photos.map((photo) => (
          <img
            key={photo}
            src={`${API_URL}${photo}`}
            alt={trip.title}
            className="w-40 h-40 object-cover rounded"
          />
        ))}
      </div>
    </div>
  );
}

export default SharePage;
```

- [ ] **Step 5: Add the /share/:id route (not protected)**

`client/src/App.jsx` — add the import and one route, keeping everything else from Task 12 unchanged:

```jsx
import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import NewTripPage from './pages/NewTripPage.jsx';
import TripDetailPage from './pages/TripDetailPage.jsx';
import EditTripPage from './pages/EditTripPage.jsx';
import SharePage from './pages/SharePage.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/share/:id" element={<SharePage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/trips/new"
        element={
          <ProtectedRoute>
            <NewTripPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/trips/:id/edit"
        element={
          <ProtectedRoute>
            <EditTripPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/trips/:id"
        element={
          <ProtectedRoute>
            <TripDetailPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd client && npx vitest run src/tests/SharePage.test.jsx`
Expected: PASS (both tests)

- [ ] **Step 7: Commit**

```bash
git add client/src
git commit -m "feat(client): add public share page"
```

---

### Task 14: Map aggregate page

**Files:**
- Create: `client/src/components/TripsMap.jsx`
- Create: `client/src/pages/MapPage.jsx`
- Modify: `client/src/App.jsx`
- Test: `client/src/tests/MapPage.test.jsx`

**Interfaces:**
- Consumes: `fetchTrips` (Task 10).

- [ ] **Step 1: Write the failing MapPage test**

`client/src/tests/MapPage.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MapPage from '../pages/MapPage.jsx';
import * as tripsApi from '../api/trips.js';

vi.mock('../api/trips.js');
vi.mock('../components/TripsMap.jsx', () => ({
  default: ({ trips }) => <div>{trips.length} pins</div>,
}));

describe('MapPage', () => {
  it('passes fetched trips down to the map', async () => {
    tripsApi.fetchTrips.mockResolvedValue([
      { _id: '1', title: 'A', location: { lat: 1, lng: 1 } },
      { _id: '2', title: 'B', location: { lat: 2, lng: 2 } },
    ]);

    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <MapPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('2 pins')).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd client && npx vitest run src/tests/MapPage.test.jsx`
Expected: FAIL (`../components/TripsMap.jsx` and `../pages/MapPage.jsx` don't exist)

- [ ] **Step 3: Create TripsMap**

`client/src/components/TripsMap.jsx`:

```jsx
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';

const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function TripsMap({ trips }) {
  const navigate = useNavigate();
  const center = trips.length > 0 ? [trips[0].location.lat, trips[0].location.lng] : [20, 0];
  const zoom = trips.length > 0 ? 3 : 2;

  return (
    <MapContainer center={center} zoom={zoom} style={{ height: '500px', width: '100%' }}>
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {trips.map((trip) => (
        <Marker
          key={trip._id}
          position={[trip.location.lat, trip.location.lng]}
          icon={markerIcon}
          eventHandlers={{ click: () => navigate(`/trips/${trip._id}`) }}
        >
          <Popup>{trip.title}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

export default TripsMap;
```

- [ ] **Step 4: Create MapPage**

`client/src/pages/MapPage.jsx`:

```jsx
import { useQuery } from '@tanstack/react-query';
import { fetchTrips } from '../api/trips.js';
import TripsMap from '../components/TripsMap.jsx';

function MapPage() {
  const { data: trips, isLoading } = useQuery({
    queryKey: ['trips'],
    queryFn: fetchTrips,
  });

  if (isLoading) return <p className="p-6">Loading map...</p>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Your trips on the map</h1>
      <TripsMap trips={trips || []} />
    </div>
  );
}

export default MapPage;
```

- [ ] **Step 5: Add the /map route**

`client/src/App.jsx` — add the import and one protected route, keeping everything else from Task 13 unchanged:

```jsx
import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import NewTripPage from './pages/NewTripPage.jsx';
import TripDetailPage from './pages/TripDetailPage.jsx';
import EditTripPage from './pages/EditTripPage.jsx';
import SharePage from './pages/SharePage.jsx';
import MapPage from './pages/MapPage.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/share/:id" element={<SharePage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/trips/new"
        element={
          <ProtectedRoute>
            <NewTripPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/trips/:id/edit"
        element={
          <ProtectedRoute>
            <EditTripPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/trips/:id"
        element={
          <ProtectedRoute>
            <TripDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/map"
        element={
          <ProtectedRoute>
            <MapPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd client && npx vitest run src/tests/MapPage.test.jsx`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add client/src
git commit -m "feat(client): add aggregate map view of all trips"
```

---

### Task 15: Polish — nav bar, landing page, final routing

**Files:**
- Create: `client/src/components/NavBar.jsx`
- Modify: `client/src/pages/LandingPage.jsx`
- Modify: `client/src/App.jsx`
- Modify: `client/src/tests/App.test.jsx`

**Interfaces:**
- Consumes: `useAuth` (Task 9).

- [ ] **Step 1: Create NavBar**

`client/src/components/NavBar.jsx`:

```jsx
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function NavBar() {
  const { isAuthenticated, logout } = useAuth();

  return (
    <nav className="border-b px-6 py-4 flex justify-between items-center">
      <Link to="/" className="font-bold text-xl">
        Travel Log
      </Link>
      <div className="space-x-4">
        {isAuthenticated ? (
          <>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/map">Map</Link>
            <button onClick={logout}>Log out</button>
          </>
        ) : (
          <>
            <Link to="/login">Log in</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default NavBar;
```

- [ ] **Step 2: Rewrite LandingPage with real marketing copy**

`client/src/pages/LandingPage.jsx` (full file):

```jsx
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function LandingPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-4xl font-bold mb-4">Travel Log</h1>
      <p className="text-gray-600 max-w-md mb-8">
        Keep a map of everywhere you've been. Log trips with photos and notes, pin them on a map,
        and share your favorites with anyone.
      </p>
      {isAuthenticated ? (
        <Link to="/dashboard" className="bg-blue-600 text-white px-6 py-3 rounded">
          Go to your dashboard
        </Link>
      ) : (
        <Link to="/register" className="bg-blue-600 text-white px-6 py-3 rounded">
          Get started
        </Link>
      )}
    </div>
  );
}

export default LandingPage;
```

- [ ] **Step 3: Render NavBar above the routes in App.jsx**

`client/src/App.jsx` (full file):

```jsx
import { Routes, Route } from 'react-router-dom';
import NavBar from './components/NavBar.jsx';
import LandingPage from './pages/LandingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import NewTripPage from './pages/NewTripPage.jsx';
import TripDetailPage from './pages/TripDetailPage.jsx';
import EditTripPage from './pages/EditTripPage.jsx';
import SharePage from './pages/SharePage.jsx';
import MapPage from './pages/MapPage.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

function App() {
  return (
    <>
      <NavBar />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/share/:id" element={<SharePage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/trips/new"
          element={
            <ProtectedRoute>
              <NewTripPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/trips/:id/edit"
          element={
            <ProtectedRoute>
              <EditTripPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/trips/:id"
          element={
            <ProtectedRoute>
              <TripDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/map"
          element={
            <ProtectedRoute>
              <MapPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}

export default App;
```

- [ ] **Step 4: Fix the App smoke test**

`NavBar` also renders the text "Travel Log" as a link, so the old `App.test.jsx` (from Task 8, checking `getByText('Travel Log')`) will now fail with a "multiple elements found" error, and `LandingPage`/`NavBar` now call `useAuth`, which needs a real or mocked `AuthProvider`.

`client/src/tests/App.test.jsx` (full file):

```jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '../App.jsx';
import { AuthProvider } from '../context/AuthContext.jsx';

function renderApp() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

describe('App', () => {
  it('renders the landing page heading', () => {
    renderApp();
    expect(screen.getByRole('heading', { name: 'Travel Log' })).toBeInTheDocument();
  });
});
```

(No token is set in `localStorage` in this test environment, so `AuthProvider`'s `fetchMe` query stays disabled and `isAuthenticated` is `false` — no network call happens and the unauthenticated nav/landing view renders.)

- [ ] **Step 5: Run the full frontend test suite**

Run: `cd client && npx vitest run`
Expected: PASS (all frontend tests across every test file)

- [ ] **Step 6: Commit**

```bash
git add client/src
git commit -m "feat(client): add nav bar and polish landing page"
```

---

### Task 16: Deployment prep

**Files:**
- Create: `.gitignore`
- Create: `README.md`

**Interfaces:**
- None — this task only adds documentation/config, no new code interfaces.

- [ ] **Step 1: Create the root .gitignore**

`.gitignore`:

```
node_modules/
.env
server/uploads/
client/dist/
```

- [ ] **Step 2: Create the README with setup and deploy instructions**

`README.md`:

```markdown
# Travel Log

A full-stack MERN app for logging trips with photos, pinning them on a map, and sharing favorites via a public link.

## Stack

- **Backend:** Node, Express, MongoDB (Mongoose), JWT auth, Multer for photo uploads.
- **Frontend:** Vite, React, Tailwind CSS, React Router, TanStack React Query, Leaflet.

## Local setup

### Backend

```bash
cd server
cp .env.example .env   # fill in MONGO_URI and JWT_SECRET
npm install
npm run dev             # http://localhost:5000
```

### Frontend

```bash
cd client
cp .env.example .env    # VITE_API_URL should point at the backend
npm install
npm run dev              # http://localhost:5173
```

### Tests

```bash
cd server && npm test
cd client && npm test
```

## Deployment

1. **Database:** create a free MongoDB Atlas cluster, copy its connection string into `MONGO_URI`.
2. **Backend (Render):** create a free web service pointed at `server/`, build command `npm install`, start command `npm start`. Set env vars `MONGO_URI`, `JWT_SECRET`, `CLIENT_ORIGIN` (your Vercel domain, once known).
3. **Frontend (Vercel):** import the repo, set the project root to `client/`, set env var `VITE_API_URL` to the Render backend's URL.
4. Once both are deployed, update the backend's `CLIENT_ORIGIN` env var to the live Vercel URL and redeploy the backend so CORS allows it.

**Known limitation:** Render's free tier uses an ephemeral filesystem, so photos uploaded to local disk are lost on redeploy or restart. This is an accepted tradeoff for a portfolio deployment — see the design spec for the rationale and future migration path (Cloudinary/S3).
```

- [ ] **Step 3: Verify the frontend production build succeeds**

Run: `cd client && npm run build`
Expected: build completes with no errors, producing `client/dist/`

- [ ] **Step 4: Verify the backend boots against a real .env**

Run: `cd server && cp .env.example .env` (fill in a real local or Atlas `MONGO_URI` and a random `JWT_SECRET`), then `npm start`
Expected: logs `Server listening on port 5000` with no connection errors; `curl http://localhost:5000/api/health` returns `{"status":"ok"}`

- [ ] **Step 5: Commit**

```bash
git add .gitignore README.md
git commit -m "docs: add gitignore and deployment instructions"
```

At this point the app is feature-complete per the spec, fully tested (backend: Jest/Supertest; frontend: Vitest/RTL), and ready to deploy to Render + Vercel + Atlas.

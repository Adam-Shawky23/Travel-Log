# Travel Log — Design Spec

Date: 2026-09-26

## Purpose

A portfolio piece demonstrating full-stack MERN skills. Polish and
demo-ability matter as much as functionality — this is meant to be shown
to employers/clients with a live, publicly reachable deployment.

## Scope (v1)

- User accounts with JWT-based auth (register/login)
- CRUD trip entries, each with a title, description, dates, one
  location pin, and photo(s)
- Interactive map (Leaflet + OpenStreetMap) showing all of a user's
  trip pins, plus a pin picker in the trip editor
- Public sharing: an owner can mark a trip public, making it viewable
  via a shareable link with no login required

Out of scope for v1: multi-stop trips (one location per trip only),
geocoding/address search (user types a free-text location name and
clicks the map to set lat/lng manually), social features beyond
single-trip sharing (no public user profile listing), e2e testing.

## Tech Stack

- **Language:** JavaScript (no TypeScript)
- **Frontend:** Vite + React + Tailwind CSS, React Router, TanStack
  React Query for server state, Leaflet for maps
- **Backend:** Node + Express, Mongoose (MongoDB), Multer for file
  uploads, JWT + bcrypt for auth
- **Database:** MongoDB (Atlas free tier in production)
- **Repo layout:** single monorepo, `client/` and `server/` top-level
  folders

## Data Models

**User**
- `name: String`
- `email: String` (unique, required)
- `passwordHash: String`
- `createdAt: Date`

**Trip**
- `owner: ObjectId` (ref `User`, required)
- `title: String` (required)
- `description: String`
- `startDate: Date`
- `endDate: Date`
- `location: { name: String, lat: Number, lng: Number }`
- `photos: [String]` (relative paths under `/uploads`)
- `isPublic: Boolean` (default `false`)
- `createdAt: Date`, `updatedAt: Date`

## API (REST)

```
POST   /api/auth/register        { name, email, password }
POST   /api/auth/login           { email, password } -> { token }
GET    /api/auth/me              (auth) current user profile

GET    /api/trips                (auth) list current user's trips
POST   /api/trips                (auth) create trip (multipart/form-data, photo upload)
GET    /api/trips/:id            (auth, owner-only) get one trip
PUT    /api/trips/:id            (auth, owner-only) update trip
DELETE /api/trips/:id            (auth, owner-only) delete trip

GET    /api/public/trips/:id     single public trip (no auth; 404 if not public or not found)

GET    /uploads/:userId/:filename   static file serving for photos
```

Auth: JWT in `Authorization: Bearer <token>` header, verified by
Express middleware on all `/api/trips` and `/api/auth/me` routes.
Ownership middleware ensures a user can only read/modify/delete their
own trips (403 otherwise). The public trip endpoint has no auth but
returns 404 (not 403) for both "doesn't exist" and "exists but
private," to avoid leaking existence of private trips via status code.

## Frontend Routes

```
/                 landing page (logged out) or redirect to /dashboard (logged in)
/login            login form
/register         registration form
/dashboard        (protected) current user's trip list
/trips/new        (protected) create trip: form + photo upload + map pin picker
/trips/:id/edit   (protected) edit trip, pre-filled
/trips/:id        (protected) trip detail view, with edit/delete/share-toggle controls
/map              (protected) map of all of the current user's trip pins
/share/:tripId    public read-only trip view, no auth required
```

`ProtectedRoute` wrapper redirects to `/login` when no valid token is
present. Auth state derived from `/api/auth/me`, cached via React
Query. All other server data (trips list, single trip) also goes
through React Query for caching/loading/error state.

## Key Flows

**Auth.** Passwords hashed with bcrypt. Login/register issue a signed
JWT (7-day expiry) returned to the client and stored in
`localStorage`. Every authenticated request attaches it as a Bearer
token. A 401 response from any request clears the stored token and
redirects to `/login`.

**Photo upload.** Multer stores files under `server/uploads/<userId>/`,
validating MIME type (jpeg/png/webp only) and a max file size (5MB).
The trip document stores the relative path(s); Express serves
`/uploads` as static files. The client shows an image preview before
submit and performs a client-side type/size check to fail fast before
hitting the network.

**Public sharing.** `isPublic` defaults to `false`. The owner toggles
it from the trip detail page. When `true`, the trip becomes reachable
at `/share/:tripId` via the public API endpoint, which 404s uniformly
for both nonexistent and private trips.

**Map.** Leaflet + OpenStreetMap tiles (free, no API key required). The
trip editor uses a click-on-map interaction to set `lat`/`lng`; the
user separately types a free-text `location.name` — no geocoding
service involved. The `/map` page plots all of the current user's
trips as pins; clicking a pin navigates to that trip's detail page.

## Error Handling

Centralized Express error-handling middleware returns consistent JSON
errors: `{ error: string }` with appropriate status codes — 400
(validation / malformed input), 401 (missing/invalid auth), 403
(authenticated but not the owner), 404 (not found), 500 (unexpected).
Mongoose validation errors and JWT verification errors are mapped
explicitly to 400/401 rather than surfacing raw stack traces to
clients.

On the frontend, React Query's error state drives inline error
messages per view/form. A top-level React error boundary catches
unexpected render crashes and shows a fallback screen instead of a
blank page.

## Testing

- **Backend:** Jest + Supertest, run against an in-memory MongoDB via
  `mongodb-memory-server`. Covers: auth (register/login/invalid
  credentials), trip CRUD, ownership enforcement (403 on other users'
  trips), and public/private visibility (404 on private trip via
  public endpoint).
- **Frontend:** Vitest + React Testing Library. Covers: auth forms
  (validation, submit), trip form (create/edit), `ProtectedRoute`
  redirect behavior.
- No end-to-end test framework in v1; the golden path (register → log
  in → create a trip with a photo and a pin → toggle public → view via
  share link) is verified manually in the browser before considering a
  milestone done.

## Deployment

- **Database:** MongoDB Atlas, free-tier cluster.
- **Backend:** Render, free web service. Environment variables:
  `MONGO_URI`, `JWT_SECRET`, `CLIENT_ORIGIN` (for CORS allowlist).
- **Frontend:** Vercel. Environment variable: `VITE_API_URL` pointing
  at the deployed Render backend URL.
- **CORS:** Express restricts allowed origin to the deployed Vercel
  domain in production (permissive in local dev).

**Known limitation, accepted:** Render's free-tier filesystem is
ephemeral — uploaded photos stored on local disk will be lost on
redeploy or dyno restart. This is an accepted tradeoff for a
demo/portfolio deployment rather than a production guarantee; a future
iteration could swap in Cloudinary or S3-backed storage without
changing the API contract (`photos` stays an array of URL-like
strings).

## Explicitly Deferred (not v1)

- Multi-stop trips / multiple pins per trip
- Geocoding / address autocomplete
- Public user-profile pages (sharing is single-trip-link only)
- End-to-end test automation
- Persistent/cloud photo storage (see limitation above)

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

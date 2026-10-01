import client from './client.js';

export async function fetchPublicTrips() {
  const res = await client.get('/api/public/trips');
  return res.data;
}

export async function fetchPublicTrip(id) {
  const res = await client.get(`/api/public/trips/${id}`);
  return res.data;
}

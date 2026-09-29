import client from './client.js';

export async function fetchPublicTrip(id) {
  const res = await client.get(`/api/public/trips/${id}`);
  return res.data;
}

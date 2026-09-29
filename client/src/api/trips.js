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
  const res = await client.post('/api/trips', formData);
  return res.data;
}

export async function updateTrip(id, data) {
  const res = await client.put(`/api/trips/${id}`, data);
  return res.data;
}

export async function deleteTrip(id) {
  await client.delete(`/api/trips/${id}`);
}

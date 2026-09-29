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

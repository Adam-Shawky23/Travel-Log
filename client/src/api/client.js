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

/**
 * Axios instance with:
 *   - baseURL: /api (proxied by Vite dev server or nginx in prod)
 *   - Request interceptor: attach Bearer token from localStorage
 *   - Response interceptor: redirect to /login on 401
 */
import axios from 'axios';

const TOKEN_KEY = 'sip_token';

const apiClient = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT on every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally — clear token and redirect
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
export { TOKEN_KEY };

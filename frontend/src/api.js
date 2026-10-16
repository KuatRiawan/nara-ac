import axios from 'axios';

// Module-level CSRF token storage so the interceptor can access it
let csrfTokenValue = null;

export function setCsrfToken(token) {
  csrfTokenValue = token;
}

export function getCsrfToken() {
  return csrfTokenValue;
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1',
  timeout: 60000,
  withCredentials: true, // Enable credentials for cookies (HttpOnly)
});

api.interceptors.request.use((config) => {
  // With HttpOnly cookies, we cannot read the token from JS
  // Axios withCredentials: true will automatically send the HttpOnly cookie
  // No need to manually set Authorization header

  // Add CSRF token for state-changing requests (AUD-004)
  const stateChangingMethods = ['post', 'put', 'patch', 'delete'];
  if (stateChangingMethods.includes(config.method?.toLowerCase()) && csrfTokenValue) {
    config.headers['X-CSRF-Token'] = csrfTokenValue;
  }

  // Anti-cache untuk semua request GET
  if (config.method === 'get') {
    config.params = config.params || {};
    config.params._t = Date.now();
  }

  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // If request was canceled by AbortController, propagate the cancel error
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }
    if (error.response) {
      if (error.response.status === 401) {
        // Clear cookie by calling logout endpoint or manually
        document.cookie = 'nara_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        csrfTokenValue = null;
        window.dispatchEvent(new Event('auth-expired'));
      }
      // Jika CSRF token ditolak, clear agar di-fetch ulang
      if (error.response.status === 403 && error.response.data?.error?.code?.startsWith('CSRF_')) {
        csrfTokenValue = null;
      }
      return Promise.reject(error.response.data);
    }
    return Promise.reject({ error: { message: 'Network error atau server mati' } });
  }
);

// Function to create API request with CSRF token for state-changing operations
export function apiWithCsrf(csrfToken) {
  const apiCsrf = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1',
    timeout: 60000,
    withCredentials: true,
  });

  apiCsrf.interceptors.request.use((config) => {
    // With HttpOnly cookies, we rely on withCredentials: true
    // No need to manually set Authorization header
    
    // Add CSRF token for state-changing requests
    const stateChangingMethods = ['post', 'put', 'patch', 'delete'];
    if (stateChangingMethods.includes(config.method?.toLowerCase()) && csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
    
    // Anti-cache untuk semua request GET
    if (config.method === 'get') {
      config.params = config.params || {};
      config.params._t = Date.now();
    }
    
    return config;
  });

  apiCsrf.interceptors.response.use(
    (response) => response.data,
    (error) => {
      if (axios.isCancel(error)) {
        return Promise.reject(error);
      }
      if (error.response) {
        if (error.response.status === 401) {
          document.cookie = 'nara_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
          window.dispatchEvent(new Event('auth-expired'));
        }
        return Promise.reject(error.response.data);
      }
      return Promise.reject({ error: { message: 'Network error atau server mati' } });
    }
  );

  return apiCsrf;
}

export default api;

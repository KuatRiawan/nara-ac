import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1',
  timeout: 10000,
  withCredentials: true, // Enable credentials for cookies
});

// Helper function to get token from cookies
function getTokenFromCookie() {
  // Check cookies directly
  const value = `; ${document.cookie}`;
  const parts = value.split(`; nara_token=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

api.interceptors.request.use((config) => {
  // Try to get token from cookies first, then localStorage for backward compatibility
  let token = getTokenFromCookie();
  if (!token) {
    token = localStorage.getItem('nara_token');
  }
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
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
        // Clear both cookie and localStorage for backward compatibility
        document.cookie = 'nara_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        localStorage.removeItem('nara_token');
        localStorage.removeItem('nara_user');
        window.dispatchEvent(new Event('auth-expired'));
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
    timeout: 10000,
    withCredentials: true,
  });

  apiCsrf.interceptors.request.use((config) => {
    let token = getTokenFromCookie();
    if (!token) {
      token = localStorage.getItem('nara_token');
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
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
          localStorage.removeItem('nara_token');
          localStorage.removeItem('nara_user');
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

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 35000, // 35 second client timeout (backend AI limit is 30s)
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('one_pause_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor to handle unauthorized / expired token responses
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Don't auto-redirect on login or register endpoints
      const url = error.config?.url || '';
      if (!url.includes('/auth/login') && !url.includes('/auth/register')) {
        localStorage.removeItem('one_pause_token');
        localStorage.removeItem('one_pause_user');
        if (window.location.pathname !== '/auth' && window.location.pathname !== '/') {
          window.location.href = '/auth';
        }
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Normalizes all Axios and server errors into concise, actionable, human-readable messages.
 * Never exposes credentials, stack traces, or internal provider error details.
 */
export function formatApiError(err: any): string {
  if (!err) return 'An unexpected error occurred.';

  // 1. Network / connection disruption or client timeout
  if (!err.response) {
    if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
      return 'Request timed out waiting for the reflection engine. Please try again.';
    }
    return 'Cannot connect to server. Please check your network connection or verify the server is running.';
  }

  const status = err.response.status;
  const detail = err.response.data?.detail;

  // 2. Structured detail object from FastAPI backend
  if (typeof detail === 'object' && detail !== null) {
    if (detail.message) {
      return detail.message;
    }
    // FastAPI validation error array: [{loc: [...], msg: "...", type: "..."}]
    if (Array.isArray(detail)) {
      const msgs = detail.map((d: any) => d.msg || d.message).filter(Boolean);
      if (msgs.length > 0) return msgs.join('. ');
    }
  }

  // 3. String detail
  if (typeof detail === 'string') {
    return detail;
  }

  // 4. HTTP Status code fallbacks
  switch (status) {
    case 400:
      return 'The request was invalid. Please check your input and try again.';
    case 401:
      return 'Your session has expired. Please sign in again to continue.';
    case 403:
      return 'You do not have permission to view or modify this reflection.';
    case 404:
      return 'The requested reflection was not found or has been removed.';
    case 422:
      return 'Validation error. Please verify the situation details and retry.';
    case 429:
      return 'Reflection rate limit or quota exceeded. Please wait a moment and try again.';
    case 502:
      return 'The reflection engine returned an invalid structured response. Please try again.';
    case 503:
      return 'The reflection service is temporarily unavailable. Please try again shortly.';
    case 500:
    default:
      return 'A server error occurred while processing your reflection. Please try again.';
  }
}

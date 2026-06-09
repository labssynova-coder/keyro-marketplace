// api.js — Central API client
// - Stores access token in localStorage
// - Auto-attaches Authorization header
// - On 401, tries refresh via httpOnly cookie, then retries
// - Exports: apiGet, apiPost, apiPut, apiDelete, apiUpload

const API_BASE = '/api';

let isRefreshing = false;
let refreshPromise = null;

async function apiFetch(path, options = {}) {
  const url = path.startsWith('http') ? path : API_BASE + path;

  const headers = { ...options.headers };

  const token = localStorage.getItem('access_token');
  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  }

  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  let response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include'
  });

  if (response.status === 401) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      const newToken = localStorage.getItem('access_token');
      if (newToken) {
        headers['Authorization'] = 'Bearer ' + newToken;
      }
      response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include'
      });
    }
  }

  if (!response.ok) {
    let errorBody = null;
    try {
      errorBody = await response.json();
    } catch (_) {
      errorBody = { message: response.statusText };
    }
    const err = new Error(errorBody.message || 'API Error');
    err.status = response.status;
    err.body = errorBody;
    throw err;
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

async function tryRefreshToken() {
  if (isRefreshing) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const res = await fetch(API_BASE + '/auth/refresh', {
        method: 'POST',
        credentials: 'include'
      });

      if (!res.ok) {
        localStorage.removeItem('access_token');
        return false;
      }

      const data = await res.json();
      if (data.accessToken) {
        localStorage.setItem('access_token', data.accessToken);
        return true;
      }

      localStorage.removeItem('access_token');
      return false;
    } catch (_) {
      localStorage.removeItem('access_token');
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function apiGet(path) {
  return apiFetch(path, { method: 'GET' });
}

function apiPost(path, body) {
  return apiFetch(path, { method: 'POST', body });
}

function apiPut(path, body) {
  return apiFetch(path, { method: 'PUT', body });
}

function apiDelete(path) {
  return apiFetch(path, { method: 'DELETE' });
}

function apiUpload(path, formData, method) {
  return apiFetch(path, {
    method: method || 'POST',
    body: formData
  });
}

// All functions are global — accessible by other scripts loaded after this one
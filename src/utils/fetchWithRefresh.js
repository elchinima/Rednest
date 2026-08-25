import { handleBackendErrorResponse } from './rateLimitInterceptor';
import { ensureClientHintsHeaders } from './clientHints';

const apiUrl = import.meta.env.VITE_API_URL || '';

let isRefreshing = false;
let refreshPromise = null;

async function doRefresh() {
  const clientHeaders = await ensureClientHintsHeaders();
  
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const refreshResponse = await fetch(`${apiUrl}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          ...clientHeaders,
        },
      });
      if (refreshResponse.ok) return true;
      if (refreshResponse.status === 401) return false;
    } catch {
    }
    if (attempt < 2) {
      await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
  return false;
}

export async function fetchWithRefresh(url, options = {}) {
  const clientHeaders = await ensureClientHintsHeaders();
  const opts = {
    ...options,
    credentials: 'include',
    headers: {
      ...clientHeaders,
      ...(options.headers || {}),
    },
  };

  let response;
  try {
    response = await fetch(url, opts);
  } catch (err) {
    await new Promise(r => setTimeout(r, 2000));
    try {
      response = await fetch(url, opts);
    } catch {
      throw err;
    }
  }

  if (response.status === 429) {
    handleBackendErrorResponse(response);
    return response;
  }

  if (response.status >= 500 && response.status <= 599) {
    await new Promise(r => setTimeout(r, 2000));
    try {
      response = await fetch(url, opts);
    } catch {
    }
    if (response.status >= 500 && response.status <= 599) {
      handleBackendErrorResponse(response);
      return response;
    }
  }

  if (response.status === 401) {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = doRefresh().finally(() => {
        isRefreshing = false;
        refreshPromise = null;
      });
    }

    const refreshed = await refreshPromise;

    if (refreshed) {
      response = await fetch(url, opts);
      if (response.status === 429 || (response.status >= 500 && response.status <= 599)) {
        handleBackendErrorResponse(response);
      }
    }
  }

  return response;
}

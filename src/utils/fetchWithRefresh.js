import { handleBackendErrorResponse } from './rateLimitInterceptor';

const apiUrl = import.meta.env.VITE_API_URL || '';

export async function fetchWithRefresh(url, options = {}) {
  const opts = { ...options, credentials: 'include' };

  let response = await fetch(url, opts);

  if (response.status === 429 || (response.status >= 500 && response.status <= 599)) {
    handleBackendErrorResponse(response);
    return response;
  }

  if (response.status === 401) {
    const refreshResponse = await fetch(`${apiUrl}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    if (refreshResponse.ok) {
      response = await fetch(url, opts);
      if (response.status === 429 || (response.status >= 500 && response.status <= 599)) {
        handleBackendErrorResponse(response);
      }
    }
  }

  return response;
}

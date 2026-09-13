export async function handleBackendErrorResponse(response) {
  if (typeof window === 'undefined') return;
  if (window.location.pathname.startsWith('/error')) return;

  const status = response?.status || 500;
  let title = '';
  let message = '';
  let retrySeconds = 0;

  try {
    const clone = response.clone();
    const data = await clone.json();
    if (data) {
      title = data.title || data.error || '';
      message = data.message || (typeof data.error === 'string' && data.error !== title ? data.error : '') || '';
      if (data.retryAfterSeconds) {
        retrySeconds = parseInt(data.retryAfterSeconds, 10);
      }
    }
  } catch {}

  if (!retrySeconds && status === 429) {
    try {
      const retryHeader = response.headers?.get('Retry-After');
      if (retryHeader) {
        const parsed = parseInt(retryHeader, 10);
        if (!isNaN(parsed) && parsed > 0) {
          retrySeconds = parsed;
        }
      }
    } catch {}
    if (!retrySeconds) retrySeconds = 30;
  }

  const query = new URLSearchParams();
  query.set('code', status.toString());
  if (title) query.set('title', title);
  if (message) query.set('message', message);
  if (retrySeconds > 0) query.set('retry', retrySeconds.toString());

  window.location.href = `/error?${query.toString()}`;
}

export function initGlobalRateLimitInterceptor() {
  // Intentionally a no-op.
  // Error handling for 429 / 5xx is handled inside fetchWithRefresh.
  // Previously this monkey-patched window.fetch which broke
  // third-party SDKs (Stripe, Google OAuth) and caused double-handling.
}

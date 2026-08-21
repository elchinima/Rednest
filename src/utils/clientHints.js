let cachedPlatformVersion = null;

if (typeof navigator !== 'undefined' && navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
  navigator.userAgentData.getHighEntropyValues(['platformVersion'])
    .then((hints) => {
      if (hints && hints.platformVersion) {
        cachedPlatformVersion = hints.platformVersion;
      }
    })
    .catch(() => {});
}

export function getClientHintsHeaders() {
  const headers = {};
  if (cachedPlatformVersion) {
    headers['X-Platform-Version'] = cachedPlatformVersion;
  }
  return headers;
}

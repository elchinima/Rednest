export const REVIEW_CATEGORIES = [
  { id: 'all', label: 'All Reviews', icon: '✨' },
  { id: 'Delivery', label: 'Delivery', icon: '🚀' },
  { id: 'Products', label: 'Products', icon: '☕' },
  { id: 'Service', label: 'Service', icon: '⭐' },
  { id: 'Staff', label: 'Staff', icon: '👥' }
];

export const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #ef4444, #b91c1c)',
  'linear-gradient(135deg, #f59e0b, #d97706)',
  'linear-gradient(135deg, #ec4899, #be185d)',
  'linear-gradient(135deg, #8b5cf6, #6d28d9)',
  'linear-gradient(135deg, #10b981, #047857)',
  'linear-gradient(135deg, #3b82f6, #1d4ed8)',
  'linear-gradient(135deg, #06b6d4, #0e7490)',
  'linear-gradient(135deg, #6366f1, #4338ca)'
];

export const getAvatarGradient = (idOrName) => {
  let hash = 0;
  const str = String(idOrName || 'user');
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[index];
};

export const formatBakuDateTime = (dateInput) => {
  if (!dateInput) return '—';
  try {
    if (typeof dateInput === 'string') {
      const match = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
      if (match) {
        const [, year, month, day, hour, minute] = match;
        return `${day}.${month}.${year}, ${hour}:${minute}`;
      }
    }
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '—';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hour = String(d.getHours()).padStart(2, '0');
    const minute = String(d.getMinutes()).padStart(2, '0');
    return `${day}.${month}.${year}, ${hour}:${minute}`;
  } catch {
    return '—';
  }
};

export const formatTimeAgo = (dateInput) => {
  if (!dateInput) return 'Today';
  try {
    let d;
    if (typeof dateInput === 'string') {
      const match = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):?(\d{2})?/);
      if (match) {
        const [, year, month, day, hour, minute, second] = match;
        d = Date.UTC(+year, +month - 1, +day, +hour, +minute, +(second || 0));
      }
    }
    if (!d) {
      const parsed = new Date(dateInput);
      if (isNaN(parsed.getTime())) return 'Today';
      d = parsed.getTime();
    }

    const nowUtc = Date.now();
    const nowBaku = nowUtc + (4 * 3600000);
    const diffMs = Math.max(0, nowBaku - d);
    const diffSec = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) {
      return 'Just now';
    }

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    }

    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }

    if (diffDays === 1) {
      return 'Yesterday';
    }

    if (diffDays < 7) {
      return `${diffDays}d ago`;
    }

    return formatBakuDateTime(dateInput);
  } catch {
    return 'Today';
  }
};


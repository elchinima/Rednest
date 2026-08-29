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
    let dateObj;
    if (dateInput instanceof Date) {
      dateObj = dateInput;
    } else {
      let str = String(dateInput).trim();
      if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(str) && !str.endsWith('Z') && !/[+-]\d{2}/.test(str.slice(-6))) {
        str = str.replace(' ', 'T') + 'Z';
      }
      dateObj = new Date(str);
    }

    if (isNaN(dateObj.getTime())) {
      dateObj = new Date(dateInput);
      if (isNaN(dateObj.getTime())) return '—';
    }

    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Baku',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(dateObj);
    const day = parts.find((p) => p.type === 'day')?.value || '00';
    const month = parts.find((p) => p.type === 'month')?.value || '00';
    const year = parts.find((p) => p.type === 'year')?.value || '0000';
    const hour = parts.find((p) => p.type === 'hour')?.value || '00';
    const minute = parts.find((p) => p.type === 'minute')?.value || '00';

    return `${day}.${month}.${year}, ${hour}:${minute}`;
  } catch {
    try {
      const d = new Date(dateInput);
      const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
      const baku = new Date(utc + (3600000 * 4));
      const day = String(baku.getDate()).padStart(2, '0');
      const month = String(baku.getMonth() + 1).padStart(2, '0');
      const year = baku.getFullYear();
      const hour = String(baku.getHours()).padStart(2, '0');
      const minute = String(baku.getMinutes()).padStart(2, '0');
      return `${day}.${month}.${year}, ${hour}:${minute}`;
    } catch {
      return '—';
    }
  }
};

export const formatTimeAgo = (dateInput) => {
  if (!dateInput) return 'Today';
  let str = String(dateInput).trim();
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(str) && !str.endsWith('Z') && !/[+-]\d{2}/.test(str.slice(-6))) {
    str = str.replace(' ', 'T') + 'Z';
  }
  const d = new Date(str);
  if (isNaN(d.getTime())) return 'Today';

  const diffMs = Math.max(0, Date.now() - d.getTime());
  const diffSec = Math.floor(diffMs / 1000);
  const diffHours = Math.floor(diffSec / 3600);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) {
    return 'Just now';
  }

  if (diffHours < 1) {
    return '1 hour ago';
  }

  if (diffHours < 24) {
    return 'Today';
  }

  if (diffDays < 7) {
    return 'This week';
  }

  if (diffDays < 30) {
    return 'This month';
  }

  return formatBakuDateTime(dateInput);
};


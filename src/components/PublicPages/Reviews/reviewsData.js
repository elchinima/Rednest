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

export const formatTimeAgo = (dateInput) => {
  if (!dateInput) return 'Recently';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'Recently';

  const diffMs = Date.now() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin} min${diffMin > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

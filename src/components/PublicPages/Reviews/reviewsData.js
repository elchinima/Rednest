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

export const normalizeLanguageCode = (langStr) => {
  if (!langStr) return '';
  const l = String(langStr).trim().toLowerCase();
  if (l.includes('ru') || l.includes('russia')) return 'ru';
  if (l.includes('az') || l.includes('azerbaijan')) return 'az';
  if (l.includes('en') || l.includes('english')) return 'en';
  return '';
};

export const detectCommentLanguage = (comment) => {
  if (!comment || typeof comment !== 'string') return '';
  const text = comment.trim();
  if (!text) return '';

  if (/[а-яёА-ЯЁ]/.test(text)) {
    return 'ru';
  }

  if (/[əıöşğçüƏIÖŞĞÇÜ]/i.test(text)) {
    return 'az';
  }

  const azKeywords = /\b(cox|çox|ela|əla|dadli|dadlı|dadlidir|dadlıdır|qeseng|qəşəng|yaxsi|yaxşı|pis|sagol|sağol|sag|sağ|olun|tesekkur|təşəkkür|minnetdaram|minnətdaram|sifaris|sifariş|catdirilma|çatdırılma|baku|baki|bakı|men|mən|sen|sən|biz|siz|ve|və|amma|ancaq|ucun|üçün|hec|heç|her|hər|bir|kimi)\b/i;
  if (azKeywords.test(text)) {
    return 'az';
  }

  const enKeywords = /\b(the|and|is|it|you|that|was|for|are|with|have|this|from|great|good|coffee|service|delivery|taste|delicious|fast|nice|friendly|best|place|food|drink|order)\b/i;
  if (enKeywords.test(text)) {
    return 'en';
  }

  if (/^[a-zA-Z0-9\s.,!?'"()#@%&*+/:;-]+$/.test(text)) {
    return 'en';
  }

  return '';
};

export const getReviewLanguage = (review) => {
  if (!review) return '';
  const fromExplicit = normalizeLanguageCode(review.language);
  if (fromExplicit) return fromExplicit;
  return detectCommentLanguage(review.comment);
};

export const doesReviewMatchLanguage = (review, userLang) => {
  if (!userLang) return false;
  const target = normalizeLanguageCode(userLang);
  if (!target) return false;
  return getReviewLanguage(review) === target;
};

export const sortReviewsByLanguage = (reviewsList, userLang) => {
  if (!Array.isArray(reviewsList) || reviewsList.length <= 1) return reviewsList || [];
  const targetLang = normalizeLanguageCode(userLang);
  if (!targetLang) return reviewsList;

  const matching = [];
  const others = [];

  for (const review of reviewsList) {
    if (doesReviewMatchLanguage(review, targetLang)) {
      matching.push(review);
    } else {
      others.push(review);
    }
  }

  return [...matching, ...others];
};


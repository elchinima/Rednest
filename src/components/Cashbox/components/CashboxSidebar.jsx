import React from 'react';

const getCategoryIcon = (category) => {
  const cat = (category || '').toLowerCase();
  if (cat.includes('drink') || cat.includes('coffee') || cat.includes('main')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
        <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
        <line x1="6" y1="1" x2="6" y2="4" />
        <line x1="10" y1="1" x2="10" y2="4" />
        <line x1="14" y1="1" x2="14" y2="4" />
      </svg>
    );
  }
  if (cat.includes('tea') || cat.includes('specialty')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M2 15h14a4 4 0 0 0 4-4V7H2v4a4 4 0 0 0 4 4z" />
        <path d="M6 19h10" />
        <path d="M18 10h2a2 2 0 0 0 0-4h-2" />
      </svg>
    );
  }
  if (cat.includes('dessert') || cat.includes('bakery') || cat.includes('sweet') || cat.includes('cake')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8" />
        <path d="M4 16s2-1 4-1 4 1 4 1 2-1 4-1 4 1 4 1" />
        <path d="M2 21h20" />
        <path d="M12 7V4" />
        <circle cx="12" cy="3" r="1" />
      </svg>
    );
  }
  if (cat.includes('sandwich') || cat.includes('food')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 11h18a2 2 0 0 0 2-2V7a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2a2 2 0 0 0 2 2z" />
        <path d="M2 15h20" />
        <path d="M4 19h16a2 2 0 0 0 2-2v-2H2v2a2 2 0 0 0 2 2z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
};

const CashboxSidebar = ({
  categories = ['All', 'Main Drinks', 'Specialty Drinks', 'Desserts'],
  selectedCategory,
  onSelectCategory,
  onPromoClick,
  hasAppliedPromo = false,
  t,
}) => {
  return (
    <aside className="cashbox-sidebar">
      <nav className="cashbox-sidebar__nav">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat;
          const displayLabel = t?.categories?.[cat] || cat;
          return (
            <button
              key={cat}
              type="button"
              className={`cashbox-sidebar__btn ${isActive ? 'cashbox-sidebar__btn--active' : ''}`}
              onClick={() => onSelectCategory(cat)}
            >
              <div className="cashbox-sidebar__icon">{getCategoryIcon(cat)}</div>
              <span className="cashbox-sidebar__label">{displayLabel}</span>
            </button>
          );
        })}
      </nav>

      <div className="cashbox-sidebar__bottom">
        <button
          type="button"
          className={`cashbox-sidebar__btn cashbox-sidebar__promo-btn ${hasAppliedPromo ? 'cashbox-sidebar__promo-btn--active' : ''}`}
          onClick={onPromoClick}
          title={hasAppliedPromo ? (t?.promoActive || 'Promo code active') : (t?.promoCodes || 'Promo Codes')}
        >
          <div className="cashbox-sidebar__icon">
            {hasAppliedPromo && <span className="cashbox-sidebar__promo-dot" />}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 9a3 3 0 0 1 0 6v3a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3a3 3 0 0 1 0-6V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />
              <path d="M9 9h.01" />
              <path d="M15 15h.01" />
              <path d="M16 8L8 16" />
            </svg>
          </div>
          <span className="cashbox-sidebar__label">
            {hasAppliedPromo ? (t?.promoActiveCount ? t.promoActiveCount(1) : 'Promo (1)') : (t?.promoCodes || 'Promo Codes')}
          </span>
        </button>
      </div>
    </aside>
  );
};

export default CashboxSidebar;

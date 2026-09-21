import React from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../../../assets/icons/rednest_logo.png';

const CashboxTopBar = ({
  cashierName,
  cashierAvatar,
  searchQuery,
  setSearchQuery,
}) => {
  const navigate = useNavigate();

  return (
    <header className="cashbox-topbar">
      <div className="cashbox-topbar__brand" onClick={() => navigate('/')}>
        <img src={logo} alt="Rednest" className="cashbox-topbar__logo" />
        <span className="cashbox-topbar__brand-text">Rednest</span>
        <span className="cashbox-topbar__badge">POS</span>
      </div>

      <div className="cashbox-topbar__search">
        <svg
          className="cashbox-topbar__search-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search products by name or category..."
          className="cashbox-topbar__search-input"
        />
        {searchQuery && (
          <button
            type="button"
            className="cashbox-topbar__search-clear"
            onClick={() => setSearchQuery('')}
            title="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      <div className="cashbox-topbar__meta">
        <div className="cashbox-topbar__chip">
          <div className="cashbox-topbar__avatar">
            {cashierAvatar ? (
              <img
                src={cashierAvatar}
                alt={cashierName}
                className="cashbox-topbar__avatar-img"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.parentElement?.querySelector('.cashbox-topbar__avatar-fallback');
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            ) : null}
            <span
              className="cashbox-topbar__avatar-fallback"
              style={{ display: cashierAvatar ? 'none' : 'flex' }}
            >
              {cashierName?.charAt(0)?.toUpperCase() || 'C'}
            </span>
          </div>
          <span>Cashier: <strong>{cashierName}</strong></span>
        </div>
      </div>
    </header>
  );
};

export default CashboxTopBar;

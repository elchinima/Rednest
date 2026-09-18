import React from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../../../assets/icons/rednest_logo.png';

const CashboxTopBar = ({
  cashierName,
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

      {/* Quick Search */}
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

      {/* Cashier Meta */}
      <div className="cashbox-topbar__meta">
        <div className="cashbox-topbar__chip">
          <div className="cashbox-topbar__avatar">
            {cashierName?.charAt(0) || 'C'}
          </div>
          <span>Cashier: <strong>{cashierName}</strong></span>
        </div>

        <button
          type="button"
          onClick={() => navigate('/')}
          className="cashbox-topbar__exit-btn"
          title="Back to Home"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </header>
  );
};

export default CashboxTopBar;

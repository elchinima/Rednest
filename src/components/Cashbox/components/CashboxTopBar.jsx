import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { isAllowedCashboxHistoryRole } from '../../../routes/CashboxProtectedRoute';
import logo from '../../../assets/icons/rednest_logo.png';
import '../Cashbox.scss';

const CashboxTopBar = ({
  cashierName,
  cashierAvatar,
  searchQuery,
  setSearchQuery,
  searchPlaceholder,
  t,
  isHistory = false,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canAccessHistory = isAllowedCashboxHistoryRole(user?.role || user?.Role);

  return (
    <header className="cashbox-topbar">
      <div
        className="cashbox-topbar__brand"
        onClick={() => navigate(isHistory ? '/cashbox' : '/')}
      >
        <img src={logo} alt="Rednest" className="cashbox-topbar__logo" />
        <span className="cashbox-topbar__brand-text">Rednest</span>
        <span className="cashbox-topbar__badge">POS</span>
      </div>

      {setSearchQuery && (
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
            value={searchQuery || ''}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              searchPlaceholder ||
              t?.searchPlaceholder ||
              'Search products by name or category...'
            }
            className="cashbox-topbar__search-input"
          />
          {searchQuery && (
            <button
              type="button"
              className="cashbox-topbar__search-clear"
              onClick={() => setSearchQuery('')}
              title={t?.clearSearch || 'Clear search'}
            >
              ✕
            </button>
          )}
        </div>
      )}

      <div className="cashbox-topbar__meta">
        {isHistory ? (
          <button
            type="button"
            className="cashbox-topbar__history-btn"
            onClick={() => navigate('/cashbox')}
            title={t?.history?.cashboxButton || t?.history?.backToCashbox || 'Cashbox'}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            <span className="cashbox-topbar__history-text">
              {t?.history?.cashboxButton || t?.history?.backToCashbox || 'Cashbox'}
            </span>
          </button>
        ) : (
          canAccessHistory && (
            <button
              type="button"
              className="cashbox-topbar__history-btn"
              onClick={() => navigate('/cashbox/history')}
              title={t?.history?.title || 'Cashbox History'}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span className="cashbox-topbar__history-text">
                {t?.history?.historyButton || 'History'}
              </span>
            </button>
          )
        )}

        <div className="cashbox-topbar__chip">
          <div className="cashbox-topbar__avatar">
            {cashierAvatar ? (
              <img
                src={cashierAvatar}
                alt={cashierName}
                className="cashbox-topbar__avatar-img"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.parentElement?.querySelector(
                    '.cashbox-topbar__avatar-fallback'
                  );
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
          <span>
            <span className="cashbox-topbar__cashier-label">
              {t?.cashier || 'Cashier:'}{' '}
            </span>
            <strong>{cashierName}</strong>
          </span>
        </div>
      </div>
    </header>
  );
};

export default CashboxTopBar;

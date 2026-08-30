import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import actionsIcon from '../../assets/icons/actions.svg';
import './AdminTableActions.scss';

const AdminTableActions = ({
  actions = [],
  index = 0,
  total = 1,
  align = 'right',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const isLowestPart = total > 2 ? index >= total - 2 : index > 0 && index === total - 1;
  const direction = (index === 0 || total <= 1) ? 'down' : (isLowestPart ? 'up' : 'down');

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const toggleMenu = (e) => {
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  };

  const handleActionClick = (e, action) => {
    e.stopPropagation();
    setIsOpen(false);
    if (typeof action.onClick === 'function') {
      action.onClick(e);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`admin-table-actions ${isOpen ? 'is-open' : ''} ${className}`}
    >
      <button
        type="button"
        className={`admin-table-actions__trigger ${isOpen ? 'active' : ''}`}
        onClick={toggleMenu}
        aria-haspopup="true"
        aria-expanded={isOpen}
        title="Actions"
      >
        <img src={actionsIcon} alt="Actions" className="admin-table-actions__icon" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={`admin-table-actions__dropdown admin-table-actions__dropdown--${direction} admin-table-actions__dropdown--align-${align}`}
            initial={{
              opacity: 0,
              scale: 0.92,
              y: direction === 'up' ? 6 : -6,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              scale: 0.92,
              y: direction === 'up' ? 6 : -6,
            }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-table-actions__menu">
              {actions.map((action, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`admin-table-actions__item ${action.variant ? `admin-table-actions__item--${action.variant}` : ''} ${action.locked ? 'admin-table-actions__item--locked' : ''}`}
                  disabled={action.disabled}
                  onClick={(e) => handleActionClick(e, action)}
                  title={action.title || action.label}
                >
                  {action.icon && (
                    <span className="admin-table-actions__item-icon">
                      {action.icon}
                    </span>
                  )}
                  <span className="admin-table-actions__item-label">{action.label}</span>
                  {action.locked && (
                    <span className="admin-table-actions__item-lock" title="Access restricted">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </span>
                  )}
                  {action.rightIcon && !action.locked && (
                    <span className="admin-table-actions__item-right-icon">
                      {action.rightIcon}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminTableActions;

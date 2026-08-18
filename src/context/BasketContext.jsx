import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { fetchWithRefresh } from '../utils/fetchWithRefresh';

const BasketContext = createContext(null);

const LOCAL_STORAGE_KEY = 'rednest_basket';

function getLocalBasket() {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function setLocalBasket(items) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

function getBakuTimeISO() {
  const d = new Date();
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const baku = new Date(utc + (3600000 * 4));
  return baku.toISOString();
}

function clearLocalBasket() {
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  } catch {}
}

export const BasketProvider = ({ children }) => {
  const { isAuthenticated, user, authLoading } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const hasSynced = useRef(false);
  const apiUrl = import.meta.env.VITE_API_URL || '';

  useEffect(() => {
    if (authLoading) return;

    const loadBasket = async () => {
      if (isAuthenticated && user) {
        const localItems = getLocalBasket();
        if (localItems.length > 0 && !hasSynced.current) {
          hasSynced.current = true;
          try {
            await fetchWithRefresh(`${apiUrl}/api/basket/sync`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ items: localItems }),
            });
            clearLocalBasket();
          } catch (err) {
            console.error('Basket sync failed:', err);
          }
        }

        try {
          const response = await fetchWithRefresh(`${apiUrl}/api/basket`);
          if (response.ok) {
            const data = await response.json();
            setItems(data.items || []);
          }
        } catch (err) {
          console.error('Failed to fetch basket:', err);
        }
      } else {
        hasSynced.current = false;
        setItems(getLocalBasket());
      }
      setLoading(false);
    };

    loadBasket();
  }, [isAuthenticated, user, authLoading]);

  const addItem = useCallback(async (productId) => {
    if (isAuthenticated && user) {
      setItems(prev => {
        const existing = prev.find(i => i.productId === productId);
        if (existing) {
          return prev.map(i => i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i);
        }
        return [...prev, { productId, addedAt: getBakuTimeISO(), quantity: 1 }];
      });

      try {
        await fetchWithRefresh(`${apiUrl}/api/basket/add`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId }),
        });
      } catch (err) {
        console.error('Failed to add item:', err);
      }
    } else {
      setItems(prev => {
        const existing = prev.find(i => i.productId === productId);
        let updated;
        if (existing) {
          updated = prev.map(i => i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i);
        } else {
          updated = [...prev, { productId, addedAt: getBakuTimeISO(), quantity: 1 }];
        }
        setLocalBasket(updated);
        return updated;
      });
    }
  }, [isAuthenticated, user, apiUrl]);

  const removeItem = useCallback(async (productId) => {
    if (isAuthenticated && user) {
      setItems(prev => {
        const existing = prev.find(i => i.productId === productId);
        if (!existing) return prev;
        if (existing.quantity <= 1) {
          return prev.filter(i => i.productId !== productId);
        }
        return prev.map(i => i.productId === productId ? { ...i, quantity: i.quantity - 1 } : i);
      });

      try {
        await fetchWithRefresh(`${apiUrl}/api/basket/remove`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId }),
        });
      } catch (err) {
        console.error('Failed to remove item:', err);
      }
    } else {
      setItems(prev => {
        const existing = prev.find(i => i.productId === productId);
        if (!existing) return prev;
        let updated;
        if (existing.quantity <= 1) {
          updated = prev.filter(i => i.productId !== productId);
        } else {
          updated = prev.map(i => i.productId === productId ? { ...i, quantity: i.quantity - 1 } : i);
        }
        setLocalBasket(updated);
        return updated;
      });
    }
  }, [isAuthenticated, user, apiUrl]);

  const deleteItem = useCallback(async (productId) => {
    if (isAuthenticated && user) {
      setItems(prev => prev.filter(i => i.productId !== productId));

      try {
        await fetchWithRefresh(`${apiUrl}/api/basket/delete/${productId}`, {
          method: 'DELETE',
        });
      } catch (err) {
        console.error('Failed to delete item:', err);
      }
    } else {
      setItems(prev => {
        const updated = prev.filter(i => i.productId !== productId);
        setLocalBasket(updated);
        return updated;
      });
    }
  }, [isAuthenticated, user, apiUrl]);

  const getItemQuantity = useCallback((productId) => {
    const item = items.find(i => i.productId === productId);
    return item ? item.quantity : 0;
  }, [items]);

  const totalCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <BasketContext.Provider value={{ items, addItem, removeItem, deleteItem, getItemQuantity, totalCount, loading }}>
      {children}
    </BasketContext.Provider>
  );
};

export const useBasket = () => {
  const ctx = useContext(BasketContext);
  if (!ctx) throw new Error('useBasket must be used within BasketProvider');
  return ctx;
};

export default BasketContext;

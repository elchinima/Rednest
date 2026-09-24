import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { fetchWithRefresh } from '../utils/fetchWithRefresh';
import { API_URL } from '../utils/config';

const BasketContext = createContext(null);

const LOCAL_STORAGE_KEY = 'rednest_basket';

const basketChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('rednest_basket_channel')
  : null;

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
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Baku',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date());
  const get = (type) => parts.find(p => p.type === type)?.value || '00';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}.000Z`;
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
  const apiUrl = API_URL;

  useEffect(() => {
    if (!basketChannel) return;

    const handleMessage = (event) => {
      if (event.data?.type === 'BASKET_SYNC' && Array.isArray(event.data.items)) {
        setItems(event.data.items);
      }
    };

    basketChannel.addEventListener('message', handleMessage);
    return () => {
      basketChannel.removeEventListener('message', handleMessage);
    };
  }, []);

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


  const broadcastSync = (newItems) => {
    try {
      basketChannel?.postMessage({ type: 'BASKET_SYNC', items: newItems });
    } catch {}
  };

  const applyUpdate = useCallback((transform, apiCall) => {
    let nextItems = null;
    setItems(prev => {
      const result = transform(prev);
      if (result === prev) return prev;
      nextItems = result;
      return result;
    });

    if (nextItems) {
      broadcastSync(nextItems);
      if (isAuthenticated && user) {
        apiCall?.().catch(err => console.error('Basket API error:', err));
      } else {
        setLocalBasket(nextItems);
      }
    }
  }, [isAuthenticated, user]);

  const addItem = useCallback(async (productId) => {
    applyUpdate(
      prev => {
        const existing = prev.find(i => i.productId === productId);
        if (existing) {
          if (existing.quantity >= 100) return prev;
          return prev.map(i => i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i);
        }
        return [...prev, { productId, addedAt: getBakuTimeISO(), quantity: 1 }];
      },
      () => fetchWithRefresh(`${apiUrl}/api/basket/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      })
    );
  }, [applyUpdate, apiUrl]);

  const removeItem = useCallback(async (productId) => {
    applyUpdate(
      prev => {
        const existing = prev.find(i => i.productId === productId);
        if (!existing) return prev;
        if (existing.quantity <= 1) {
          return prev.filter(i => i.productId !== productId);
        }
        return prev.map(i => i.productId === productId ? { ...i, quantity: i.quantity - 1 } : i);
      },
      () => fetchWithRefresh(`${apiUrl}/api/basket/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      })
    );
  }, [applyUpdate, apiUrl]);

  const deleteItem = useCallback(async (productId) => {
    applyUpdate(
      prev => prev.filter(i => i.productId !== productId),
      () => fetchWithRefresh(`${apiUrl}/api/basket/delete/${productId}`, {
        method: 'DELETE',
      })
    );
  }, [applyUpdate, apiUrl]);

  const getItemQuantity = useCallback((productId) => {
    const item = items.find(i => i.productId === productId);
    return item ? item.quantity : 0;
  }, [items]);

  const clearBasket = useCallback(() => {
    setItems([]);
    clearLocalBasket();
    broadcastSync([]);
  }, []);

  const totalCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <BasketContext.Provider value={{ items, addItem, removeItem, deleteItem, getItemQuantity, clearBasket, totalCount, loading }}>
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

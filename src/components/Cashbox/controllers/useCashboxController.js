import { useState, useEffect, useMemo, useCallback } from 'react';
import { API_URL } from '../../../utils/config';
import { fetchWithRefresh } from '../../../utils/fetchWithRefresh';
import { useAuth } from '../../../context/AuthContext';

export function useCashboxController() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Active receipt (cart)
  const [cartItems, setCartItems] = useState([]);

  // Calculator / tender state
  const [receivedAmount, setReceivedAmount] = useState('50.00');

  // Cashier info
  const cashierName = user?.name || user?.username || 'Anna K.';

  // Extract English name from product
  const getProductName = useCallback((item) => {
    if (!item) return 'Item';
    if (typeof item.nameTranslations === 'object' && item.nameTranslations?.EN) {
      return item.nameTranslations.EN;
    }
    if (typeof item.name === 'object') {
      return item.name.EN || item.name.AZ || item.name.RU || 'Item';
    }
    return item.name || 'Item';
  }, []);

  // Extract English description
  const getProductDescription = useCallback((item) => {
    if (!item) return '';
    if (typeof item.descriptionTranslations === 'object' && item.descriptionTranslations?.EN) {
      return item.descriptionTranslations.EN;
    }
    if (typeof item.description === 'object') {
      return item.description.EN || item.description.AZ || item.description.RU || '';
    }
    return item.description || '';
  }, []);

  // Helper to extract product icon or image from all possible formats
  const resolveProductImage = useCallback((item) => {
    if (!item) return '';
    if (item.images && typeof item.images === 'object') {
      const icon = item.images.icon || item.images.Icon;
      const img = item.images.image || item.images.Image;
      return icon || img || '';
    }
    if (typeof item.images === 'string' && item.images.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(item.images);
        return parsed.icon || parsed.Icon || parsed.image || parsed.Image || '';
      } catch {}
    }
    return item.iconUrl || item.imageUrl || item.image || item.icon || '';
  }, []);

  // Fetch products directly from backend database
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Try public products endpoint with lang=en
      let res = await fetchWithRefresh(`${API_URL}/api/products?lang=en`);
      const isJson1 = res.headers.get('content-type')?.includes('application/json');
      if (res.ok && isJson1) {
        const data = await res.json();
        let flat = [];
        if (Array.isArray(data)) {
          data.forEach((group) => {
            const groupCategory = group.category || 'General';
            if (Array.isArray(group.items)) {
              group.items.forEach((item) => {
                const img = resolveProductImage(item);
                flat.push({
                  ...item,
                  _id: item._id || item.id,
                  category: item.category || groupCategory,
                  displayName: item.name || 'Product',
                  displayDescription: item.description || '',
                  imageUrl: img,
                  iconUrl: img,
                  image: img,
                });
              });
            } else if (group._id || group.id || group.name) {
              const img = resolveProductImage(group);
              flat.push({
                ...group,
                _id: group._id || group.id,
                category: group.category || groupCategory,
                displayName: group.name || 'Product',
                displayDescription: group.description || '',
                imageUrl: img,
                iconUrl: img,
                image: img,
              });
            }
          });
        }
        if (flat.length > 0) {
          setProducts(flat);
          setCartItems((prev) => {
            if (prev.length > 0) return prev;
            return flat.slice(0, 3).map((p, idx) => {
              const rawPrice = p.prices?.price ?? p.price ?? 4.0;
              const priceNum = typeof rawPrice === 'number' ? rawPrice : parseFloat(rawPrice) || 4.0;
              return {
                id: `cart-init-${idx}`,
                productId: p._id,
                name: p.displayName,
                image: p.imageUrl || p.image,
                price: priceNum,
                qty: idx === 1 ? 2 : 1,
              };
            });
          });
          return;
        }
      }

      // 2. Fallback to admin products endpoint
      res = await fetchWithRefresh(`${API_URL}/api/admin/products`);
      const isJson2 = res.headers.get('content-type')?.includes('application/json');
      if (res.ok && isJson2) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const flat = data.map((item) => {
            const img = resolveProductImage(item);
            return {
              ...item,
              _id: item._id || item.id,
              displayName: getProductName(item),
              displayDescription: getProductDescription(item),
              imageUrl: img,
              iconUrl: img,
              image: img,
            };
          });
          setProducts(flat);
          setCartItems((prev) => {
            if (prev.length > 0) return prev;
            return flat.slice(0, 3).map((p, idx) => {
              const rawPrice = p.prices?.price ?? p.price ?? 4.0;
              const priceNum = typeof rawPrice === 'number' ? rawPrice : parseFloat(rawPrice) || 4.0;
              return {
                id: `cart-init-${idx}`,
                productId: p._id,
                name: p.displayName,
                image: p.imageUrl || p.image,
                price: priceNum,
                qty: idx === 1 ? 2 : 1,
              };
            });
          });
        }
      }
    } catch (err) {
      console.error('Failed to load DB products in Cashbox:', err);
    } finally {
      setLoading(false);
    }
  }, [getProductName, getProductDescription]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Dynamically extract unique categories from DB products
  const categories = useMemo(() => {
    const set = new Set(['All']);
    products.forEach((p) => {
      if (p.category && typeof p.category === 'string') {
        set.add(p.category.trim());
      }
    });
    return Array.from(set);
  }, [products]);

  // Filter products by category and search query
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((item) => {
      const name = (item.displayName || getProductName(item)).toLowerCase();
      const desc = (item.displayDescription || getProductDescription(item)).toLowerCase();
      const category = (item.category || '').toLowerCase();

      const matchesSearch = !q || name.includes(q) || desc.includes(q) || category.includes(q);
      if (!matchesSearch) return false;

      if (selectedCategory === 'All') return true;
      return item.category?.toLowerCase() === selectedCategory.toLowerCase();
    });
  }, [products, searchQuery, selectedCategory, getProductName, getProductDescription]);

  // Calculate price directly from product
  const getProductPrice = (item) => {
    const raw = item.prices?.price !== undefined ? item.prices.price : item.price;
    const base = typeof raw === 'number' ? raw : parseFloat(raw) || 0;
    return Number(base.toFixed(2));
  };

  // Add item to active order receipt
  const addToCart = (product) => {
    const prodId = product._id || product.id;
    const price = getProductPrice(product);
    const prodName = product.displayName || getProductName(product);
    const prodImg = product.imageUrl || product.image || resolveProductImage(product);

    setCartItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.productId === prodId);
      if (existingIdx > -1) {
        const next = [...prev];
        next[existingIdx] = { ...next[existingIdx], qty: next[existingIdx].qty + 1 };
        return next;
      }
      return [
        ...prev,
        {
          id: `cart-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          productId: prodId,
          name: prodName,
          image: prodImg,
          price,
          qty: 1,
        },
      ];
    });
  };

  // Stepper updates
  const updateItemQty = (id, delta) => {
    setCartItems((prev) => {
      return prev
        .map((item) => {
          if (item.id === id) {
            const nextQty = item.qty + delta;
            return nextQty > 0 ? { ...item, qty: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean);
    });
  };

  const removeCartItem = (id) => {
    setCartItems((prev) => prev.filter((i) => i.id !== id));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  // Receipt Total
  const totalAmount = useMemo(() => {
    const sum = cartItems.reduce((acc, item) => acc + item.price * item.qty, 0);
    return Number(sum.toFixed(2));
  }, [cartItems]);

  // Touch Numpad & Tender calculations
  const handleNumpadPress = (char) => {
    if (char === 'C') {
      setReceivedAmount('0');
      return;
    }
    if (char === '⌫') {
      setReceivedAmount((prev) => (prev.length > 1 ? prev.slice(0, -1) : '0'));
      return;
    }
    setReceivedAmount((prev) => {
      if (prev === '0' && char !== '.') return char;
      if (char === '.' && prev.includes('.')) return prev;
      if (prev.includes('.') && prev.split('.')[1]?.length >= 2) return prev;
      return `${prev}${char}`;
    });
  };

  const handleBanknoteClick = (amount) => {
    setReceivedAmount(amount.toFixed(2));
  };

  // Change amount: Received - Total
  const changeAmount = useMemo(() => {
    const received = parseFloat(receivedAmount) || 0;
    const diff = received - totalAmount;
    return diff > 0 ? Number(diff.toFixed(2)) : 0;
  }, [receivedAmount, totalAmount]);

  return {
    cashierName,
    products,
    categories,
    filteredProducts,
    loading,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    getProductPrice,
    getProductName,
    cartItems,
    addToCart,
    updateItemQty,
    removeCartItem,
    clearCart,
    totalAmount,
    receivedAmount,
    handleNumpadPress,
    handleBanknoteClick,
    changeAmount,
  };
}

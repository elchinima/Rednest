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
  const [selectedSizes, setSelectedSizes] = useState({});

  // Active receipt (cart)
  const [cartItems, setCartItems] = useState([]);

  // Calculator / tender state
  const [receivedAmount, setReceivedAmount] = useState('50.00');

  // Shift & Cashier info
  const [shiftSeconds, setShiftSeconds] = useState(16335); // 04:32:15
  const [heldOrdersCount] = useState(3);
  const [cashDrawerBalance] = useState('1,450.80');
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

  // Fetch products directly from backend database
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Try public products endpoint with lang=en
      let res = await fetchWithRefresh(`${API_URL}/api/products?lang=en`);
      if (res.ok) {
        const data = await res.json();
        let flat = [];
        if (Array.isArray(data)) {
          data.forEach((group) => {
            const groupCategory = group.category || 'General';
            if (Array.isArray(group.items)) {
              group.items.forEach((item) => {
                flat.push({
                  ...item,
                  _id: item._id || item.id,
                  category: item.category || groupCategory,
                  displayName: item.name || 'Product',
                  displayDescription: item.description || '',
                });
              });
            } else if (group._id || group.id || group.name) {
              flat.push({
                ...group,
                _id: group._id || group.id,
                category: group.category || groupCategory,
                displayName: group.name || 'Product',
                displayDescription: group.description || '',
              });
            }
          });
        }
        if (flat.length > 0) {
          setProducts(flat);
          // Set initial demo cart from loaded DB products if cart is empty
          setCartItems((prev) => {
            if (prev.length > 0) return prev;
            return flat.slice(0, 3).map((p, idx) => {
              const rawPrice = p.prices?.price ?? p.price ?? 4.0;
              const priceNum = typeof rawPrice === 'number' ? rawPrice : parseFloat(rawPrice) || 4.0;
              const size = idx === 1 ? 'S' : 'M';
              return {
                id: `cart-init-${idx}`,
                productId: p._id,
                name: p.displayName,
                size,
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
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const flat = data.map((item) => ({
            ...item,
            _id: item._id || item.id,
            displayName: getProductName(item),
            displayDescription: getProductDescription(item),
          }));
          setProducts(flat);
          setCartItems((prev) => {
            if (prev.length > 0) return prev;
            return flat.slice(0, 3).map((p, idx) => {
              const rawPrice = p.prices?.price ?? p.price ?? 4.0;
              const priceNum = typeof rawPrice === 'number' ? rawPrice : parseFloat(rawPrice) || 4.0;
              const size = idx === 1 ? 'S' : 'M';
              return {
                id: `cart-init-${idx}`,
                productId: p._id,
                name: p.displayName,
                size,
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

  // Shift Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setShiftSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedShiftTime = useMemo(() => {
    const hrs = String(Math.floor(shiftSeconds / 3600)).padStart(2, '0');
    const mins = String(Math.floor((shiftSeconds % 3600) / 60)).padStart(2, '0');
    const secs = String(shiftSeconds % 60).padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  }, [shiftSeconds]);

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

  // Manage size per product
  const setProductSize = (productId, size) => {
    setSelectedSizes((prev) => ({ ...prev, [productId]: size }));
  };

  const getProductSize = (productId) => {
    return selectedSizes[productId] || 'M';
  };

  // Calculate dynamic price based on size
  const getProductPrice = (item, size = 'M') => {
    const raw = item.prices?.price !== undefined ? item.prices.price : item.price;
    const base = typeof raw === 'number' ? raw : parseFloat(raw) || 0;

    if (size === 'S') return Math.max(1, Number((base - 0.5).toFixed(2)));
    if (size === 'L') return Number((base + 0.8).toFixed(2));
    return Number(base.toFixed(2));
  };

  // Add item to active order receipt
  const addToCart = (product) => {
    const prodId = product._id || product.id;
    const size = getProductSize(prodId);
    const price = getProductPrice(product, size);
    const prodName = product.displayName || getProductName(product);

    setCartItems((prev) => {
      const existingIdx = prev.findIndex(
        (i) => i.productId === prodId && i.size === size
      );
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
          size,
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
    shiftTime: formattedShiftTime,
    cashDrawerBalance,
    heldOrdersCount,
    products,
    categories,
    filteredProducts,
    loading,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    selectedSizes,
    setProductSize,
    getProductSize,
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

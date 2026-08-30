import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AdminLayout from '../AdminLayout/AdminLayout';
import { fetchWithRefresh } from '../../../utils/fetchWithRefresh';
import { useAuth } from '../../../context/AuthContext';
import loaderIcon from '../../../assets/icons/loader-animated.svg';
import loaderIconRed from '../../../assets/icons/loader-animated-red.svg';
import AdminTableActions from '../../Elements/AdminTableActions';
import './Products.scss';

const DEFAULT_CATEGORIES = ['Main Drinks', 'Specialty Drinks', 'Desserts'];

const cleanRole = (role) => (role || '').toLowerCase().replace(/\s+/g, '');

const Products = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortBy, setSortBy] = useState('name-asc');
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [activeProduct, setActiveProduct] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Main Drinks',
    imageUrl: '',
    iconUrl: '',
    isActive: true,
  });

  const apiUrl = import.meta.env.VITE_API_URL || '';

  const currentUserRole = cleanRole(user?.role || user?.Role);
  const isSuperAdmin = currentUserRole === 'superadmin' || currentUserRole === 'super admin';

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'success' }), 3500);
  };

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      let res = await fetchWithRefresh(`${apiUrl}/api/admin/products`);
      if (res.ok) {
        const data = await res.json();
        setProducts(Array.isArray(data) ? data : []);
      } else {
        res = await fetchWithRefresh(`${apiUrl}/api/products`);
        if (res.ok) {
          const data = await res.json();
          const flat = [];
          if (Array.isArray(data)) {
            data.forEach((group) => {
              if (Array.isArray(group.items)) {
                group.items.forEach((item) => {
                  flat.push({
                    ...item,
                    category: item.category || group.category || 'Main Drinks',
                    price: typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0,
                    formattedPrice: typeof item.price === 'number' ? item.price.toFixed(2) : String(item.price || '0.00'),
                  });
                });
              }
            });
          }
          setProducts(flat);
        } else {
          showToast('Failed to load products list', 'error');
        }
      }
    } catch {
      showToast('Error connecting to server', 'error');
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const allCategories = useMemo(() => {
    const set = new Set(DEFAULT_CATEGORIES);
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products
      .filter((item) => {
        const matchesSearch =
          !searchQuery.trim() ||
          item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCat =
          selectedCategory === 'all' ||
          item.category?.toLowerCase() === selectedCategory.toLowerCase();
        const matchesStatus =
          selectedStatus === 'all' ||
          (selectedStatus === 'active' && item.isActive !== false) ||
          (selectedStatus === 'inactive' && item.isActive === false);
        return matchesSearch && matchesCat && matchesStatus;
      })
      .sort((a, b) => {
        const priceA = parseFloat(a.price) || 0;
        const priceB = parseFloat(b.price) || 0;
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();

        switch (sortBy) {
          case 'sold-desc':
            return (b.totalSold || 0) - (a.totalSold || 0);
          case 'price-asc':
            return priceA - priceB;
          case 'price-desc':
            return priceB - priceA;
          case 'name-desc':
            return nameB.localeCompare(nameA);
          case 'category':
            return (a.category || '').localeCompare(b.category || '') || nameA.localeCompare(nameB);
          case 'name-asc':
          default:
            return nameA.localeCompare(nameB);
        }
      });
  }, [products, searchQuery, selectedCategory, selectedStatus, sortBy]);

  const stats = useMemo(() => {
    const total = products.length;
    const catCount = allCategories.length;
    const prices = products.map((p) => parseFloat(p.price) || 0).filter((p) => p > 0);
    const avgPrice = prices.length > 0 ? (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2) : '0.00';
    const minPrice = prices.length > 0 ? Math.min(...prices).toFixed(2) : '0.00';
    const maxPrice = prices.length > 0 ? Math.max(...prices).toFixed(2) : '0.00';
    return { total, catCount, avgPrice, priceRange: `${minPrice} - ${maxPrice} ₼` };
  }, [products, allCategories]);

  const handleOpenCreate = () => {
    setActiveProduct(null);
    setForm({
      name: '',
      description: '',
      price: '',
      category: 'Main Drinks',
      imageUrl: '',
      iconUrl: '',
      isActive: true,
    });
    setIsEditModalOpen(true);
  };

  const handleOpenEdit = (product) => {
    setActiveProduct(product);
    setForm({
      name: product.name || '',
      description: product.description || '',
      price: String(product.price ?? ''),
      category: product.category || 'Main Drinks',
      imageUrl: product.images?.image || product.imageUrl || '',
      iconUrl: product.images?.icon || product.iconUrl || '',
      isActive: product.isActive !== false,
    });
    setIsEditModalOpen(true);
  };

  const handleToggleActive = async (prod) => {
    try {
      const res = await fetchWithRefresh(`${apiUrl}/api/admin/products/${prod.id}/toggle-active`, {
        method: 'PATCH',
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        showToast(data.message || 'Product status updated.');
        setProducts((prev) =>
          prev.map((p) => (p.id === prod.id ? { ...p, isActive: !p.isActive } : p))
        );
      } else {
        showToast('Failed to update product status.', 'error');
      }
    } catch {
      showToast('Network error while updating status.', 'error');
    }
  };

  const handleOpenDetails = (product) => {
    setActiveProduct(product);
    setIsDetailsModalOpen(true);
  };

  const handleDeleteClick = (product) => {
    if (!isSuperAdmin) {
      showToast('Access denied. Only Super Admin can delete products.', 'error');
      return;
    }
    setActiveProduct(product);
    setIsDeleteModalOpen(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      showToast('Product name is required.', 'error');
      return;
    }
    if (form.name.trim().length > 50) {
      showToast('Product name cannot exceed 50 characters.', 'error');
      return;
    }
    if (form.description.trim().length > 250) {
      showToast('Product description cannot exceed 250 characters.', 'error');
      return;
    }
    const numPrice = parseFloat(form.price);
    if (isNaN(numPrice) || numPrice < 0) {
      showToast('Please enter a valid price.', 'error');
      return;
    }

    setIsSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      price: numPrice,
      category: form.category || 'Main Drinks',
      imageUrl: form.imageUrl.trim(),
      iconUrl: form.iconUrl.trim(),
      isActive: form.isActive,
    };

    try {
      const isEditing = Boolean(activeProduct?.id);
      const url = isEditing
        ? `${apiUrl}/api/admin/products/${activeProduct.id}`
        : `${apiUrl}/api/admin/products`;
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetchWithRefresh(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast(isEditing ? 'Product updated successfully.' : 'Product created successfully.');
        setIsEditModalOpen(false);
        fetchProducts();
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.message || 'Operation failed.', 'error');
      }
    } catch {
      showToast('Connection error while saving product.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!activeProduct?.id) return;
    setIsDeleting(true);
    try {
      const res = await fetchWithRefresh(`${apiUrl}/api/admin/products/${activeProduct.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        showToast('Product deleted successfully.');
        setIsDeleteModalOpen(false);
        setActiveProduct(null);
        fetchProducts();
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.message || 'Failed to delete product. Only Super Admin can delete products.', 'error');
      }
    } catch {
      showToast('Network error while deleting product.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const getCategoryClass = (cat) => {
    const c = (cat || '').toLowerCase();
    if (c.includes('main')) return 'admin-products__category-badge--main';
    if (c.includes('special')) return 'admin-products__category-badge--specialty';
    if (c.includes('dessert')) return 'admin-products__category-badge--dessert';
    return 'admin-products__category-badge--other';
  };

  return (
    <AdminLayout>
      <div className="admin-products">
        <AnimatePresence>
          {toast.message && (
            <motion.div
              className={`admin-products__toast ${toast.type === 'error' ? 'admin-products__toast--error' : ''}`}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
            >
              {toast.type === 'error' ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
              <span>{toast.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="admin-products__header">
          <div>
            <h1 className="admin-products__title">Products</h1>
            <p className="admin-products__subtitle">
              Manage store catalog, prices, categories, and beverage/dessert items
            </p>
          </div>

          <div className="admin-products__header-actions">
            <button
              type="button"
              className="admin-products__btn-primary"
              onClick={handleOpenCreate}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Product
            </button>
          </div>
        </div>

        <div className="admin-products__stats">
          <div className="admin-products__stat-card">
            <div className="admin-products__stat-icon admin-products__stat-icon--total">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
                <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
                <line x1="6" y1="1" x2="6" y2="4" />
                <line x1="10" y1="1" x2="10" y2="4" />
                <line x1="14" y1="1" x2="14" y2="4" />
              </svg>
            </div>
            <div className="admin-products__stat-info">
              <span className="admin-products__stat-value">{stats.total}</span>
              <span className="admin-products__stat-label">Total Items</span>
            </div>
          </div>

          <div className="admin-products__stat-card">
            <div className="admin-products__stat-icon admin-products__stat-icon--categories">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </div>
            <div className="admin-products__stat-info">
              <span className="admin-products__stat-value">{stats.catCount}</span>
              <span className="admin-products__stat-label">Categories</span>
            </div>
          </div>

          <div className="admin-products__stat-card">
            <div className="admin-products__stat-icon admin-products__stat-icon--avg">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <div className="admin-products__stat-info">
              <span className="admin-products__stat-value">{stats.avgPrice} ₼</span>
              <span className="admin-products__stat-label">Avg. Price</span>
            </div>
          </div>

          <div className="admin-products__stat-card">
            <div className="admin-products__stat-icon admin-products__stat-icon--range">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                <polyline points="16 7 22 7 22 13" />
              </svg>
            </div>
            <div className="admin-products__stat-info">
              <span className="admin-products__stat-value">{stats.priceRange}</span>
              <span className="admin-products__stat-label">Price Range</span>
            </div>
          </div>
        </div>

        <div className="admin-products__controls">
          <div className="admin-products__search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search by product name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="admin-products__search-clear"
                onClick={() => setSearchQuery('')}
              >
                ✕
              </button>
            )}
          </div>

          <div className="admin-products__filters">
            <select
              className="admin-products__select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">All Categories ({products.length})</option>
              {allCategories.map((cat) => {
                const count = products.filter(
                  (p) => (p.category || '').toLowerCase() === cat.toLowerCase()
                ).length;
                return (
                  <option key={cat} value={cat}>
                    {cat} ({count})
                  </option>
                );
              })}
            </select>

            <select
              className="admin-products__select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="all">All Status ({products.length})</option>
              <option value="active">
                Active ({products.filter((p) => p.isActive !== false).length})
              </option>
              <option value="inactive">
                Inactive ({products.filter((p) => p.isActive === false).length})
              </option>
            </select>

            <select
              className="admin-products__select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="sold-desc">Units Sold (Most)</option>
              <option value="price-asc">Price (Low to High)</option>
              <option value="price-desc">Price (High to Low)</option>
              <option value="category">Category</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="admin-products__loading">
            <img src={loaderIcon} alt="Loading..." className="admin-products__spinner" />
            <p>Loading products catalog...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="admin-products__empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
              <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
              <line x1="6" y1="1" x2="6" y2="4" />
              <line x1="10" y1="1" x2="10" y2="4" />
              <line x1="14" y1="1" x2="14" y2="4" />
            </svg>
            <h3>No products found</h3>
            <p>
              {searchQuery || selectedCategory !== 'all'
                ? 'Try adjusting your search query or category filter.'
                : 'Your catalog is empty. Click "Add Product" above to create the first item.'}
            </p>
          </div>
        ) : (
          <>
            <div className="admin-products__table-wrapper">
              <table className="admin-products__table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th className="text-center">Sold</th>
                    <th className="text-center">Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((prod, idx) => {
                    const priceFormatted = typeof prod.price === 'number'
                      ? prod.price.toFixed(2)
                      : parseFloat(prod.price || 0).toFixed(2);
                    const iconUrl = prod.images?.icon || prod.images?.image || prod.imageUrl;

                    const actions = [
                      {
                        label: 'View Details',
                        icon: (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        ),
                        onClick: () => handleOpenDetails(prod),
                      },
                      {
                        label: 'Edit Product',
                        icon: (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        ),
                        onClick: () => handleOpenEdit(prod),
                      },
                      {
                        label: prod.isActive !== false ? 'Deactivate' : 'Activate',
                        icon: (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            {prod.isActive !== false ? (
                              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                            ) : (
                              <polyline points="9 12 11 14 15 10" />
                            )}
                          </svg>
                        ),
                        onClick: () => handleToggleActive(prod),
                      },
                      {
                        label: 'Delete Product',
                        variant: 'danger',
                        locked: !isSuperAdmin,
                        title: !isSuperAdmin ? 'Only Super Admin can delete products' : 'Delete',
                        icon: (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        ),
                        onClick: () => handleDeleteClick(prod),
                      },
                    ];

                    return (
                      <tr key={prod.id || idx}>
                        <td>
                          <div className="admin-products__product-cell">
                            <div className="admin-products__thumb-wrap">
                              {iconUrl ? (
                                <img
                                  src={iconUrl}
                                  alt={prod.name}
                                  className="admin-products__thumb-img"
                                  loading="lazy"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                  }}
                                />
                              ) : (
                                <span className="admin-products__thumb-fallback">☕</span>
                              )}
                            </div>
                            <div className="admin-products__product-info">
                              <span className="admin-products__product-name">{prod.name}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span
                            className={`admin-products__category-badge ${getCategoryClass(prod.category)}`}
                          >
                            {prod.category || 'Main Drinks'}
                          </span>
                        </td>
                        <td>
                          <span className="admin-products__price-text">{priceFormatted} ₼</span>
                        </td>
                        <td className="text-center">
                          <span className="admin-products__sold-pill">{prod.totalSold ?? 0}</span>
                        </td>
                        <td className="text-center">
                          <span
                            className={`admin-products__status-badge ${prod.isActive !== false ? 'admin-products__status-badge--active' : 'admin-products__status-badge--inactive'}`}
                            onClick={() => handleToggleActive(prod)}
                            title="Click to toggle status"
                          >
                            {prod.isActive !== false ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <AdminTableActions
                            actions={actions}
                            index={idx}
                            total={filteredProducts.length}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="admin-products__mobile-grid">
              {filteredProducts.map((prod, idx) => {
                const priceFormatted = typeof prod.price === 'number'
                  ? prod.price.toFixed(2)
                  : parseFloat(prod.price || 0).toFixed(2);
                const iconUrl = prod.images?.icon || prod.images?.image || prod.imageUrl;

                const actions = [
                  {
                    label: 'View Details',
                    icon: (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    ),
                    onClick: () => handleOpenDetails(prod),
                  },
                  {
                    label: 'Edit Product',
                    icon: (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    ),
                    onClick: () => handleOpenEdit(prod),
                  },
                  {
                    label: 'Delete Product',
                    variant: 'danger',
                    locked: !isSuperAdmin,
                    title: !isSuperAdmin ? 'Only Super Admin can delete products' : 'Delete',
                    icon: (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    ),
                    onClick: () => handleDeleteClick(prod),
                  },
                ];

                return (
                  <div key={prod.id || idx} className="admin-products__mobile-card">
                    <div className="admin-products__mobile-top">
                      <div className="admin-products__product-cell">
                        <div className="admin-products__thumb-wrap">
                          {iconUrl ? (
                            <img
                              src={iconUrl}
                              alt={prod.name}
                              className="admin-products__thumb-img"
                              loading="lazy"
                            />
                          ) : (
                            <span className="admin-products__thumb-fallback">☕</span>
                          )}
                        </div>
                        <div className="admin-products__product-info">
                          <span className="admin-products__product-name">{prod.name}</span>
                          <span
                            className={`admin-products__category-badge ${getCategoryClass(prod.category)}`}
                          >
                            {prod.category || 'Main Drinks'}
                          </span>
                        </div>
                      </div>
                      <AdminTableActions actions={actions} index={idx} total={filteredProducts.length} />
                    </div>

                    {prod.description && (
                      <div className="admin-products__mobile-desc">{prod.description}</div>
                    )}

                    <div className="admin-products__mobile-bottom">
                      <div className="admin-products__mobile-meta-item">
                        <span className="admin-products__stat-label">Sold</span>
                        <span className="admin-products__sold-pill">{prod.totalSold ?? 0}</span>
                      </div>
                      <div className="admin-products__mobile-meta-item" style={{ alignItems: 'flex-end' }}>
                        <span className="admin-products__stat-label">Price</span>
                        <span className="admin-products__price-text">{priceFormatted} ₼</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <AnimatePresence>
          {isDetailsModalOpen && activeProduct && (
            <div
              className="animated-modal-overlay"
              style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0,0,0,0.7)',
                backdropFilter: 'blur(10px)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
              }}
              onClick={() => setIsDetailsModalOpen(false)}
            >
              <motion.div
                className="product-modal"
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="product-modal__header">
                  <h3>Product Details</h3>
                  <button
                    type="button"
                    className="product-modal__close-btn"
                    onClick={() => setIsDetailsModalOpen(false)}
                  >
                    ✕
                  </button>
                </div>

                <div className="product-modal__details">
                  <div className="product-modal__details-top">
                    {activeProduct.images?.icon || activeProduct.images?.image || activeProduct.imageUrl ? (
                      <img
                        src={activeProduct.images?.icon || activeProduct.images?.image || activeProduct.imageUrl}
                        alt={activeProduct.name}
                        className="product-modal__details-img"
                      />
                    ) : (
                      <div
                        className="product-modal__details-img"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '2rem',
                          background: 'rgba(255,255,255,0.05)',
                        }}
                      >
                        ☕
                      </div>
                    )}
                    <div className="product-modal__details-meta">
                      <h4 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>
                        {activeProduct.name}
                      </h4>
                      <span
                        className={`admin-products__category-badge ${getCategoryClass(activeProduct.category)}`}
                        style={{ alignSelf: 'flex-start' }}
                      >
                        {activeProduct.category || 'Main Drinks'}
                      </span>
                      <div className="product-modal__details-price">
                        {typeof activeProduct.price === 'number'
                          ? activeProduct.price.toFixed(2)
                          : parseFloat(activeProduct.price || 0).toFixed(2)}{' '}
                        ₼
                      </div>
                    </div>
                  </div>

                  <div className="product-modal__details-box">
                    <span>Description</span>
                    <p>{activeProduct.description || 'No description provided for this item.'}</p>
                  </div>

                  <div className="product-modal__details-box">
                    <span>Units Sold</span>
                    <p style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>
                      {activeProduct.totalSold ?? 0} {activeProduct.totalSold === 1 ? 'unit' : 'units'}
                    </p>
                  </div>

                  <div className="product-modal__details-box">
                    <span>Catalog Status</span>
                    <div style={{ marginTop: 4 }}>
                      <span
                        className={`admin-products__status-badge ${activeProduct.isActive !== false ? 'admin-products__status-badge--active' : 'admin-products__status-badge--inactive'}`}
                      >
                        {activeProduct.isActive !== false ? 'Active (Visible in menu)' : 'Inactive (Hidden)'}
                      </span>
                    </div>
                  </div>

                  <div className="product-modal__details-box">
                    <span>Product ID</span>
                    <p style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#aaa' }}>
                      {activeProduct.id}
                    </p>
                  </div>
                </div>

                <div className="product-modal__footer">
                  <button
                    type="button"
                    className="admin-products__btn-secondary"
                    onClick={() => setIsDetailsModalOpen(false)}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    className="admin-products__btn-primary"
                    onClick={() => {
                      setIsDetailsModalOpen(false);
                      handleOpenEdit(activeProduct);
                    }}
                  >
                    Edit Product
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isEditModalOpen && (
            <div
              className="animated-modal-overlay"
              style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0,0,0,0.7)',
                backdropFilter: 'blur(10px)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
              }}
              onClick={() => !isSaving && setIsEditModalOpen(false)}
            >
              <motion.div
                className="product-modal"
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="product-modal__header">
                  <h3>{activeProduct ? 'Edit Product' : 'Add New Product'}</h3>
                  <button
                    type="button"
                    className="product-modal__close-btn"
                    onClick={() => setIsEditModalOpen(false)}
                    disabled={isSaving}
                  >
                    ✕
                  </button>
                </div>

                <form className="product-modal__form" onSubmit={handleSaveProduct}>
                  <div className="product-modal__form-group">
                    <div className="product-modal__label-row">
                      <label>Product Name *</label>
                      <span className={`product-modal__counter ${form.name.length >= 50 ? 'limit' : ''}`}>
                        {form.name.length}/50
                      </span>
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. Red Latte, Croissant"
                      value={form.name}
                      maxLength={50}
                      onChange={(e) => setForm({ ...form, name: e.target.value.slice(0, 50) })}
                      required
                    />
                  </div>

                  <div className="product-modal__form-row">
                    <div className="product-modal__form-group">
                      <label>Category *</label>
                      <select
                        value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                      >
                        {DEFAULT_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="product-modal__form-group">
                      <label>Price (₼) *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="e.g. 3.75"
                        value={form.price}
                        onChange={(e) => setForm({ ...form, price: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="product-modal__form-group">
                    <label>Description</label>
                    <div className="product-modal__label-row">
                      <span className={`product-modal__counter ${form.description.length >= 250 ? 'limit' : ''}`}>
                        {form.description.length}/250
                      </span>
                    </div>
                    <textarea
                      placeholder="Enter product taste notes, ingredients, or story..."
                      value={form.description}
                      maxLength={250}
                      onChange={(e) => setForm({ ...form, description: e.target.value.slice(0, 250) })}
                    />
                  </div>

                  <div className="product-modal__form-group">
                    <label className="product-modal__switch-label">
                      <input
                        type="checkbox"
                        checked={form.isActive}
                        onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                      />
                      <span className="product-modal__switch-slider" />
                      <span className="product-modal__switch-text">
                        {form.isActive ? 'Active (Visible in menu & catalog)' : 'Inactive (Hidden from customers)'}
                      </span>
                    </label>
                  </div>

                  <div className="product-modal__form-group">
                    <label>Image URL (Photo)</label>
                    <div className="product-modal__image-preview-wrap">
                      {form.imageUrl ? (
                        <img
                          src={form.imageUrl}
                          alt="Image Preview"
                          className="product-modal__image-preview"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div
                          className="product-modal__image-preview"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.4rem',
                          }}
                        >
                          ☕
                        </div>
                      )}

                      <div className="product-modal__image-actions">
                        <input
                          type="url"
                          placeholder="https://... photo URL"
                          value={form.imageUrl}
                          onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="product-modal__form-group">
                    <label>Icon URL (Transparent WebP)</label>
                    <div className="product-modal__image-preview-wrap">
                      {form.iconUrl ? (
                        <img
                          src={form.iconUrl}
                          alt="Icon Preview"
                          className="product-modal__image-preview"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div
                          className="product-modal__image-preview"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.4rem',
                          }}
                        >
                          ☕
                        </div>
                      )}

                      <div className="product-modal__image-actions">
                        <input
                          type="url"
                          placeholder="https://... icon URL"
                          value={form.iconUrl}
                          onChange={(e) => setForm({ ...form, iconUrl: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="product-modal__footer">
                    <button
                      type="button"
                      className="admin-products__btn-secondary"
                      onClick={() => setIsEditModalOpen(false)}
                      disabled={isSaving}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="admin-products__btn-primary"
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <img
                            src={loaderIcon}
                            alt="Saving..."
                            style={{ width: 16, height: 16 }}
                          />
                          Saving...
                        </>
                      ) : activeProduct ? (
                        'Save Changes'
                      ) : (
                        'Create Product'
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isDeleteModalOpen && activeProduct && (
            <div
              className="animated-modal-overlay"
              style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0,0,0,0.7)',
                backdropFilter: 'blur(10px)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
              }}
              onClick={() => !isDeleting && setIsDeleteModalOpen(false)}
            >
              <motion.div
                className="product-modal"
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="product-modal__header">
                  <h3>Delete Product?</h3>
                  <button
                    type="button"
                    className="product-modal__close-btn"
                    onClick={() => setIsDeleteModalOpen(false)}
                    disabled={isDeleting}
                  >
                    ✕
                  </button>
                </div>

                <div className="product-modal__delete-box">
                  {activeProduct.images?.icon || activeProduct.images?.image || activeProduct.imageUrl ? (
                    <img
                      src={activeProduct.images?.icon || activeProduct.images?.image || activeProduct.imageUrl}
                      alt={activeProduct.name}
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 12,
                        objectFit: 'cover',
                        background: 'rgba(0, 0, 0, 0.45)',
                        padding: 0,
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                    />
                  ) : (
                    <div className="product-modal__delete-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </div>
                  )}

                  <p className="product-modal__delete-text">
                    Are you sure you want to delete <strong>"{activeProduct.name}"</strong>?
                  </p>

                  <div className="product-modal__delete-warning">
                    This action will permanently delete this product from the menu catalog and database.
                  </div>
                </div>

                <div className="product-modal__footer">
                  <button
                    type="button"
                    className="admin-products__btn-secondary"
                    onClick={() => setIsDeleteModalOpen(false)}
                    disabled={isDeleting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="admin-products__btn-primary"
                    style={{ background: 'linear-gradient(135deg, #ef4444, #991b1b)' }}
                    onClick={handleConfirmDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <img
                          src={loaderIconRed}
                          alt="Deleting..."
                          style={{ width: 16, height: 16 }}
                        />
                        Deleting...
                      </>
                    ) : (
                      'Delete Product'
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
};

export default Products;

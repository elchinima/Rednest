import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AdminLayout from '../AdminLayout/AdminLayout';
import { fetchWithRefresh } from '../../../utils/fetchWithRefresh';
import { useAuth } from '../../../context/AuthContext';
import loaderIcon from '../../../assets/icons/loader-animated.svg';
import loaderIconRed from '../../../assets/icons/loader-animated-red.svg';
import AdminTableActions from '../../Elements/AdminTableActions';
import './Newsletter.scss';

const PAGE_SIZE = 12;

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Baku',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return formatter.format(d);
  } catch {
    return '—';
  }
};

const formatRelativeTime = (dateStr) => {
  if (!dateStr) return 'Never';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
};

const getInitials = (name, email) => {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  if (email && email.trim()) {
    return email.slice(0, 2).toUpperCase();
  }
  return 'U';
};

const TEMPLATE_PRESETS = [
  {
    id: 'special-promo',
    name: 'Special Promotion',
    icon: '🎁',
    description: 'Exclusive discount & special rewards offer',
    data: {
      subject: '🎁 Exclusive Rednest Club Offer: 20% Off Your Next Order!',
      preheader: 'Unlock your special member reward this weekend only.',
      badge: 'EXCLUSIVE OFFER',
      heading: 'A Special Treat For You, {name}!',
      bodyHtml: `<p>Hello <strong>{name}</strong>,</p>
<p>As a valued member of the <strong>Rednest Club</strong>, we are thrilled to offer you an exclusive <strong>20% discount</strong> on our entire premium menu this week!</p>
<p>Whether you're craving our handcrafted specialty coffee, signature cold brews, or artisanal sweet bites, your member discount is ready to be claimed.</p>
<p style="padding:14px 18px;background:rgba(229,62,62,0.12);border-left:4px solid #e53e3e;border-radius:6px;margin:20px 0;">
  Use promo code <strong style="color:#ff6b6b;letter-spacing:1px;">REDNEST20</strong> at checkout or show this email to our barista.
</p>
<p>Thank you for choosing Rednest. We can't wait to craft your next favorite cup!</p>`,
      buttonText: 'Order Online Now',
      buttonUrl: 'https://rednest.az/catalog',
      senderName: 'Rednest Coffee',
    },
  },
  {
    id: 'new-menu',
    name: 'New Menu & Flavors',
    icon: '☕',
    description: 'Announce seasonal creations and new arrivals',
    data: {
      subject: '☕ Introducing Our New Signature Seasonal Menu!',
      preheader: 'Discover handcrafted blends and autumn specials designed for you.',
      badge: 'NEW ARRIVALS',
      heading: 'Fresh Flavors Have Arrived, {name}!',
      bodyHtml: `<p>Hello <strong>{name}</strong>,</p>
<p>We are delighted to introduce our brand new collection of seasonal signature beverages and desserts at Rednest!</p>
<ul style="margin:16px 0;padding-left:20px;color:#e2e8f0;">
  <li><strong>Velvet Pistachio Latte</strong> &mdash; Smooth espresso with rich pistachio cream & crushed nuts.</li>
  <li><strong>Ruby Berry Cascara</strong> &mdash; Refreshing infused coffee cherry tea with wild berries.</li>
  <li><strong>Salted Caramel Dream</strong> &mdash; Signature cold brew with handcrafted honeycomb foam.</li>
</ul>
<p>Drop by any Rednest lounge or order online to be among the first to experience these curated flavors.</p>`,
      buttonText: 'Explore New Menu',
      buttonUrl: 'https://rednest.az/catalog',
      senderName: 'Rednest Lounge',
    },
  },
  {
    id: 'celebration',
    name: 'Weekend Celebration',
    icon: '🎉',
    description: 'Warm weekend wishes and club bonuses',
    data: {
      subject: '🎉 Celebrate Your Weekend With Rednest!',
      preheader: 'Double reward points and complimentary surprises for club members.',
      badge: 'CLUB EVENT',
      heading: 'Make Your Weekend Extraordinary',
      bodyHtml: `<p>Hello <strong>{name}</strong>,</p>
<p>The weekend is here, and the Rednest family is ready to welcome you with warm ambiance, exceptional coffee, and great vibes.</p>
<p>Enjoy <strong>2x Cashback Points</strong> on all orders placed through your account this Saturday and Sunday.</p>
<p>Relax, unwind, and treat yourself to the moments that matter most.</p>`,
      buttonText: 'Visit Rednest Today',
      buttonUrl: 'https://rednest.az',
      senderName: 'Rednest Club',
    },
  },
  {
    id: 'announcement',
    name: 'General Announcement',
    icon: '📢',
    description: 'System updates, store hours, and news',
    data: {
      subject: '📢 Important Update: New Lounge Features & Hours',
      preheader: 'We are expanding our services to serve you better.',
      badge: 'ANNOUNCEMENT',
      heading: 'Exciting News From Rednest',
      bodyHtml: `<p>Hello <strong>{name}</strong>,</p>
<p>We are constantly striving to improve your experience at Rednest. We're excited to announce updated operating hours and expanded delivery coverage across the city!</p>
<p>You can now order your favorite drinks even faster with our improved digital menu and quick-pickup feature.</p>
<p>As always, thank you for being an indispensable part of our journey.</p>`,
      buttonText: 'Learn More',
      buttonUrl: 'https://rednest.az',
      senderName: 'Rednest Team',
    },
  },
  {
    id: 'blank',
    name: 'Blank Template',
    icon: '✏️',
    description: 'Start with an empty canvas',
    data: {
      subject: '',
      preheader: '',
      badge: 'NEWSLETTER',
      heading: 'Dear {name},',
      bodyHtml: '<p>Write your custom email content here...</p>',
      buttonText: '',
      buttonUrl: '',
      senderName: 'Rednest',
    },
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.35, ease: [0.16, 1, 0.3, 1] },
  }),
};

const Newsletter = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('compose'); // 'compose' | 'subscribers' | 'history'

  // Stats
  const [stats, setStats] = useState({
    totalSubscribers: 0,
    totalCampaigns: 0,
    totalDelivered: 0,
    lastBroadcast: null,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // Subscribers
  const [subscribers, setSubscribers] = useState([]);
  const [subscribersLoading, setSubscribersLoading] = useState(false);
  const [subscribersSearch, setSubscribersSearch] = useState('');
  const [subscribersFilter, setSubscribersFilter] = useState('all');
  const [togglingUserId, setTogglingUserId] = useState(null);

  // History
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Compose form state
  const [form, setForm] = useState({
    subject: TEMPLATE_PRESETS[0].data.subject,
    preheader: TEMPLATE_PRESETS[0].data.preheader,
    badge: TEMPLATE_PRESETS[0].data.badge,
    heading: TEMPLATE_PRESETS[0].data.heading,
    bodyHtml: TEMPLATE_PRESETS[0].data.bodyHtml,
    buttonText: TEMPLATE_PRESETS[0].data.buttonText,
    buttonUrl: TEMPLATE_PRESETS[0].data.buttonUrl,
    senderName: TEMPLATE_PRESETS[0].data.senderName,
  });
  const [selectedTemplateId, setSelectedTemplateId] = useState(TEMPLATE_PRESETS[0].id);
  const [previewDevice, setPreviewDevice] = useState('desktop'); // 'desktop' | 'mobile'

  // Test Email Modal
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testEmailInput, setTestEmailInput] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Broadcast Confirmation Modal
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [confirmedSafety, setConfirmedSafety] = useState(false);

  // Toast
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [copiedId, setCopiedId] = useState(null);

  const apiUrl = import.meta.env.VITE_API_URL || '';

  const showToast = (message, type = 'success') => {
    const isErr = type === 'error' || /failed|error|denied|invalid/i.test(message);
    setToast({ message, type: isErr ? 'error' : 'success' });
  };

  useEffect(() => {
    if (!toast.message) return;
    const timer = setTimeout(() => setToast({ message: '', type: 'success' }), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Fetch Stats
  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const res = await fetchWithRefresh(`${apiUrl}/api/admin/newsletter/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching newsletter stats:', err);
    } finally {
      setStatsLoading(false);
    }
  }, [apiUrl]);

  // Fetch Subscribers
  const fetchSubscribers = useCallback(async () => {
    try {
      setSubscribersLoading(true);
      const res = await fetchWithRefresh(`${apiUrl}/api/admin/newsletter/subscribers`);
      if (res.ok) {
        const data = await res.json();
        setSubscribers(data || []);
      }
    } catch (err) {
      console.error('Error fetching subscribers:', err);
      showToast('Failed to load subscribers.', 'error');
    } finally {
      setSubscribersLoading(false);
    }
  }, [apiUrl]);

  // Fetch History
  const fetchHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const res = await fetchWithRefresh(`${apiUrl}/api/admin/newsletter/history`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data || []);
      }
    } catch (err) {
      console.error('Error fetching newsletter history:', err);
      showToast('Failed to load campaign history.', 'error');
    } finally {
      setHistoryLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (activeTab === 'subscribers') {
      fetchSubscribers();
    } else if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab, fetchSubscribers, fetchHistory]);

  // Apply template
  const handleSelectTemplate = (template) => {
    setSelectedTemplateId(template.id);
    setForm({
      subject: template.data.subject,
      preheader: template.data.preheader,
      badge: template.data.badge,
      heading: template.data.heading,
      bodyHtml: template.data.bodyHtml,
      buttonText: template.data.buttonText,
      buttonUrl: template.data.buttonUrl,
      senderName: template.data.senderName,
    });
  };

  // Insert tag helper
  const handleInsertTag = (tag) => {
    setForm((prev) => ({
      ...prev,
      bodyHtml: prev.bodyHtml + tag,
    }));
  };

  // Toggle subscriber status
  const handleToggleSubscriber = async (userId) => {
    setTogglingUserId(userId);
    try {
      const res = await fetchWithRefresh(`${apiUrl}/api/admin/newsletter/subscribers/${userId}/toggle`, {
        method: 'PATCH',
      });
      if (res.ok) {
        const data = await res.json();
        setSubscribers((prev) =>
          prev.map((sub) => (sub.id === userId ? { ...sub, subscribe: data.subscribe } : sub))
        );
        showToast(data.message || 'Subscriber status updated.');
        fetchStats();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.message || 'Failed to update subscriber.', 'error');
      }
    } catch (err) {
      showToast('Network error while updating subscriber.', 'error');
    } finally {
      setTogglingUserId(null);
    }
  };

  // Send Test Email
  const handleSendTest = async (e) => {
    e?.preventDefault();
    if (!testEmailInput.trim()) {
      showToast('Please enter a valid recipient email address.', 'error');
      return;
    }
    if (!form.subject.trim()) {
      showToast('Please specify an email subject.', 'error');
      return;
    }
    if (!form.bodyHtml.trim()) {
      showToast('Please enter email body content.', 'error');
      return;
    }

    setIsSendingTest(true);
    try {
      const res = await fetchWithRefresh(`${apiUrl}/api/admin/newsletter/send-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toEmail: testEmailInput.trim(),
          subject: form.subject,
          preheader: form.preheader,
          badge: form.badge,
          heading: form.heading,
          bodyHtml: form.bodyHtml,
          buttonText: form.buttonText,
          buttonUrl: form.buttonUrl,
          senderName: form.senderName,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        showToast(data.message || 'Test email sent successfully!');
        setIsTestModalOpen(false);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.message || 'Failed to send test email.', 'error');
      }
    } catch (err) {
      showToast('Network error while sending test email.', 'error');
    } finally {
      setIsSendingTest(false);
    }
  };

  // Broadcast to all subscribers
  const handleBroadcast = async () => {
    if (!confirmedSafety) {
      showToast('Please confirm before broadcasting to all subscribers.', 'error');
      return;
    }

    setIsBroadcasting(true);
    try {
      const res = await fetchWithRefresh(`${apiUrl}/api/admin/newsletter/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: form.subject,
          preheader: form.preheader,
          badge: form.badge,
          heading: form.heading,
          bodyHtml: form.bodyHtml,
          buttonText: form.buttonText,
          buttonUrl: form.buttonUrl,
          senderName: form.senderName,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        showToast(data.message || 'Broadcast completed successfully!');
        setIsBroadcastModalOpen(false);
        setConfirmedSafety(false);
        fetchStats();
        if (activeTab === 'history') fetchHistory();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.message || 'Failed to broadcast newsletter.', 'error');
      }
    } catch (err) {
      showToast('Network error while broadcasting newsletter.', 'error');
    } finally {
      setIsBroadcasting(false);
    }
  };

  // Delete history item
  const handleDeleteHistory = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetchWithRefresh(`${apiUrl}/api/admin/newsletter/history/${itemToDelete.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setHistory((prev) => prev.filter((item) => item.id !== itemToDelete.id));
        showToast('Campaign record deleted successfully.');
        setItemToDelete(null);
        fetchStats();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.message || 'Failed to delete record.', 'error');
      }
    } catch (err) {
      showToast('Network error while deleting record.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Load history item into composer
  const handleLoadIntoComposer = (item) => {
    setForm({
      subject: item.subject || '',
      preheader: item.preheader || '',
      badge: item.badge || '',
      heading: item.heading || '',
      bodyHtml: item.plainText || item.contentHtml || '',
      buttonText: item.buttonText || '',
      buttonUrl: item.buttonUrl || '',
      senderName: item.senderName || 'Rednest',
    });
    setSelectedTemplateId('custom');
    setActiveTab('compose');
    showToast('Campaign content loaded into composer.');
  };

  // Copy helper
  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered subscribers
  const filteredSubscribers = useMemo(() => {
    return subscribers.filter((sub) => {
      const q = subscribersSearch.toLowerCase().trim();
      const matchQuery =
        !q ||
        (sub.name && sub.name.toLowerCase().includes(q)) ||
        (sub.email && sub.email.toLowerCase().includes(q));

      if (!matchQuery) return false;

      if (subscribersFilter === 'active') return sub.isActive;
      if (subscribersFilter === 'subscribed') return sub.subscribe;
      if (subscribersFilter === 'unsubscribed') return !sub.subscribe;
      return true;
    });
  }, [subscribers, subscribersSearch, subscribersFilter]);

  // Render processed HTML preview for simulator
  const previewHtml = useMemo(() => {
    const safeRecipientName = user?.name || user?.Name || 'Alex Rivers';
    const safeRecipientEmail = user?.email || user?.Email || 'member@rednest.com';
    const year = new Date().getFullYear().toString();

    let body = form.bodyHtml || '<p style="color:#64748b;">No content entered yet...</p>';
    body = body
      .replace(/{name}/g, safeRecipientName)
      .replace(/{email}/g, safeRecipientEmail)
      .replace(/{year}/g, year);

    return body;
  }, [form.bodyHtml, user]);

  return (
    <AdminLayout>
      <div className="admin-newsletter">
        {/* Toast Notification */}
        <AnimatePresence>
          {toast.message && (
            <motion.div
              className={`admin-newsletter__toast ${
                toast.type === 'error' ? 'admin-newsletter__toast--error' : ''
              }`}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.25 }}
            >
              {toast.type === 'error' ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              )}
              <span>{toast.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Page Header */}
        <motion.div
          className="admin-newsletter__header"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div>
            <div className="admin-newsletter__badge">
              <span className="admin-newsletter__badge-dot"></span>
              BROADCAST ENGINE
            </div>
            <h1 className="admin-newsletter__title">Newsletter & Campaigns</h1>
            <p className="admin-newsletter__subtitle">
              Compose, simulate, and broadcast personalized email newsletters to all verified Rednest Club members.
            </p>
          </div>

          <div className="admin-newsletter__header-actions">
            <button
              className="admin-newsletter__btn-secondary"
              onClick={() => {
                fetchStats();
                if (activeTab === 'subscribers') fetchSubscribers();
                if (activeTab === 'history') fetchHistory();
                showToast('Newsletter data refreshed.');
              }}
              title="Refresh Data"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              Refresh
            </button>
          </div>
        </motion.div>

        {/* Analytics / Stats Grid */}
        <div className="admin-newsletter__stats-grid">
          <motion.div className="admin-newsletter__stat-card" variants={fadeUp} initial="hidden" animate="show" custom={0}>
            <div className="admin-newsletter__stat-icon admin-newsletter__stat-icon--subscribers">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div className="admin-newsletter__stat-content">
              <div className="admin-newsletter__stat-label">Active Subscribers</div>
              <div className="admin-newsletter__stat-value">
                {statsLoading ? <img src={loaderIcon} alt="Loading..." className="admin-newsletter__loader-mini" /> : stats.totalSubscribers.toLocaleString()}
              </div>
              <div className="admin-newsletter__stat-sub">Users with newsletter active</div>
            </div>
          </motion.div>

          <motion.div className="admin-newsletter__stat-card" variants={fadeUp} initial="hidden" animate="show" custom={1}>
            <div className="admin-newsletter__stat-icon admin-newsletter__stat-icon--campaigns">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <div className="admin-newsletter__stat-content">
              <div className="admin-newsletter__stat-label">Total Broadcasts</div>
              <div className="admin-newsletter__stat-value">
                {statsLoading ? <img src={loaderIcon} alt="Loading..." className="admin-newsletter__loader-mini" /> : stats.totalCampaigns.toLocaleString()}
              </div>
              <div className="admin-newsletter__stat-sub">Campaigns sent to date</div>
            </div>
          </motion.div>

          <motion.div className="admin-newsletter__stat-card" variants={fadeUp} initial="hidden" animate="show" custom={2}>
            <div className="admin-newsletter__stat-icon admin-newsletter__stat-icon--delivered">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <div className="admin-newsletter__stat-content">
              <div className="admin-newsletter__stat-label">Emails Delivered</div>
              <div className="admin-newsletter__stat-value">
                {statsLoading ? <img src={loaderIcon} alt="Loading..." className="admin-newsletter__loader-mini" /> : stats.totalDelivered.toLocaleString()}
              </div>
              <div className="admin-newsletter__stat-sub">Total recipients reached</div>
            </div>
          </motion.div>

          <motion.div className="admin-newsletter__stat-card" variants={fadeUp} initial="hidden" animate="show" custom={3}>
            <div className="admin-newsletter__stat-icon admin-newsletter__stat-icon--time">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div className="admin-newsletter__stat-content">
              <div className="admin-newsletter__stat-label">Last Broadcast</div>
              <div className="admin-newsletter__stat-value" style={{ fontSize: stats.lastBroadcast ? '1.25rem' : '1.5rem' }}>
                {statsLoading ? <img src={loaderIcon} alt="Loading..." className="admin-newsletter__loader-mini" /> : (stats.lastBroadcast ? formatRelativeTime(stats.lastBroadcast) : 'None yet')}
              </div>
              <div className="admin-newsletter__stat-sub">
                {stats.lastBroadcast ? formatDate(stats.lastBroadcast) : 'Ready for first send'}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Navigation Tabs */}
        <div className="admin-newsletter__tabs">
          <button
            className={`admin-newsletter__tab-btn ${activeTab === 'compose' ? 'admin-newsletter__tab-btn--active' : ''}`}
            onClick={() => setActiveTab('compose')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
            Compose & Broadcast
          </button>

          <button
            className={`admin-newsletter__tab-btn ${activeTab === 'subscribers' ? 'admin-newsletter__tab-btn--active' : ''}`}
            onClick={() => setActiveTab('subscribers')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Subscribers ({stats.totalSubscribers})
          </button>

          <button
            className={`admin-newsletter__tab-btn ${activeTab === 'history' ? 'admin-newsletter__tab-btn--active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Broadcast History ({stats.totalCampaigns})
          </button>
        </div>

        {/* TAB 1: COMPOSE & BROADCAST */}
        {activeTab === 'compose' && (
          <motion.div
            className="admin-newsletter__compose-layout"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Left: Composer Form */}
            <div className="admin-newsletter__form-column">
              {/* Template Presets Picker */}
              <div className="admin-newsletter__card">
                <div className="admin-newsletter__card-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <line x1="3" y1="9" x2="21" y2="9" />
                    <line x1="9" y1="21" x2="9" y2="9" />
                  </svg>
                  Select Campaign Preset
                </div>
                <div className="admin-newsletter__templates-grid">
                  {TEMPLATE_PRESETS.map((tmpl) => (
                    <button
                      key={tmpl.id}
                      type="button"
                      className={`admin-newsletter__template-card ${
                        selectedTemplateId === tmpl.id ? 'admin-newsletter__template-card--active' : ''
                      }`}
                      onClick={() => handleSelectTemplate(tmpl)}
                    >
                      <div className="admin-newsletter__template-icon">{tmpl.icon}</div>
                      <div className="admin-newsletter__template-name">{tmpl.name}</div>
                      <div className="admin-newsletter__template-desc">{tmpl.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Details Form */}
              <div className="admin-newsletter__card">
                <div className="admin-newsletter__card-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Campaign Details & Content
                </div>

                <div className="admin-newsletter__form-group">
                  <label className="admin-newsletter__form-label">
                    Email Subject Line <span className="admin-newsletter__required">*</span>
                  </label>
                  <input
                    type="text"
                    className="admin-newsletter__input"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    placeholder="e.g. 🎁 Exclusive 20% Discount for Rednest Members"
                  />
                </div>

                <div className="admin-newsletter__form-row">
                  <div className="admin-newsletter__form-group">
                    <label className="admin-newsletter__form-label">Preheader Snippet</label>
                    <input
                      type="text"
                      className="admin-newsletter__input"
                      value={form.preheader}
                      onChange={(e) => setForm({ ...form, preheader: e.target.value })}
                      placeholder="Short preview text shown in mailbox"
                    />
                  </div>

                  <div className="admin-newsletter__form-group">
                    <label className="admin-newsletter__form-label">Sender Name</label>
                    <input
                      type="text"
                      className="admin-newsletter__input"
                      value={form.senderName}
                      onChange={(e) => setForm({ ...form, senderName: e.target.value })}
                      placeholder="e.g. Rednest Coffee"
                    />
                  </div>
                </div>

                <div className="admin-newsletter__form-row">
                  <div className="admin-newsletter__form-group">
                    <label className="admin-newsletter__form-label">Header Badge Tag</label>
                    <input
                      type="text"
                      className="admin-newsletter__input"
                      value={form.badge}
                      onChange={(e) => setForm({ ...form, badge: e.target.value })}
                      placeholder="e.g. SPECIAL OFFER, NEW ARRIVAL"
                    />
                  </div>

                  <div className="admin-newsletter__form-group">
                    <label className="admin-newsletter__form-label">Inner Title Heading</label>
                    <input
                      type="text"
                      className="admin-newsletter__input"
                      value={form.heading}
                      onChange={(e) => setForm({ ...form, heading: e.target.value })}
                      placeholder="e.g. A Special Treat For You, {name}!"
                    />
                  </div>
                </div>

                {/* Body Content with Dynamic Tag Helper */}
                <div className="admin-newsletter__form-group">
                  <div className="admin-newsletter__form-header-with-tags">
                    <label className="admin-newsletter__form-label">
                      Message Body (HTML Supported) <span className="admin-newsletter__required">*</span>
                    </label>
                    <div className="admin-newsletter__tag-badges">
                      <span className="admin-newsletter__tag-label">Insert Dynamic Tag:</span>
                      <button
                        type="button"
                        className="admin-newsletter__tag-pill"
                        onClick={() => handleInsertTag('{name}')}
                        title="Recipient First Name / Full Name"
                      >
                        + {'{name}'}
                      </button>
                      <button
                        type="button"
                        className="admin-newsletter__tag-pill"
                        onClick={() => handleInsertTag('{email}')}
                        title="Recipient Email"
                      >
                        + {'{email}'}
                      </button>
                      <button
                        type="button"
                        className="admin-newsletter__tag-pill"
                        onClick={() => handleInsertTag('{year}')}
                        title="Current Year"
                      >
                        + {'{year}'}
                      </button>
                    </div>
                  </div>

                  <textarea
                    rows={8}
                    className="admin-newsletter__textarea"
                    value={form.bodyHtml}
                    onChange={(e) => setForm({ ...form, bodyHtml: e.target.value })}
                    placeholder="Enter HTML or plain formatted text for the email body..."
                  />
                </div>

                {/* Call to Action Button */}
                <div className="admin-newsletter__cta-box">
                  <div className="admin-newsletter__card-subtitle">Call-To-Action Button (Optional)</div>
                  <div className="admin-newsletter__form-row">
                    <div className="admin-newsletter__form-group">
                      <label className="admin-newsletter__form-label">Button Text</label>
                      <input
                        type="text"
                        className="admin-newsletter__input"
                        value={form.buttonText}
                        onChange={(e) => setForm({ ...form, buttonText: e.target.value })}
                        placeholder="e.g. Order Online Now"
                      />
                    </div>
                    <div className="admin-newsletter__form-group">
                      <label className="admin-newsletter__form-label">Target URL</label>
                      <input
                        type="text"
                        className="admin-newsletter__input"
                        value={form.buttonUrl}
                        onChange={(e) => setForm({ ...form, buttonUrl: e.target.value })}
                        placeholder="e.g. https://rednest.az/catalog"
                      />
                    </div>
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="admin-newsletter__form-actions">
                  <button
                    type="button"
                    className="admin-newsletter__btn-outline"
                    onClick={() => {
                      setTestEmailInput(user?.email || user?.Email || '');
                      setIsTestModalOpen(true);
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    Send Test Preview
                  </button>

                  <button
                    type="button"
                    className="admin-newsletter__btn-primary"
                    onClick={() => {
                      if (!form.subject.trim()) {
                        showToast('Please enter an email subject line.', 'error');
                        return;
                      }
                      if (!form.bodyHtml.trim()) {
                        showToast('Please enter message body content.', 'error');
                        return;
                      }
                      setConfirmedSafety(false);
                      setIsBroadcastModalOpen(true);
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                    Broadcast to {stats.totalSubscribers} Subscribers
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Live Interactive Simulator Preview */}
            <div className="admin-newsletter__preview-column">
              <div className="admin-newsletter__preview-card">
                <div className="admin-newsletter__preview-header">
                  <div className="admin-newsletter__preview-title">
                    <span className="admin-newsletter__live-dot"></span>
                    Live Email Simulator
                  </div>

                  <div className="admin-newsletter__device-toggle">
                    <button
                      type="button"
                      className={`admin-newsletter__device-btn ${previewDevice === 'desktop' ? 'admin-newsletter__device-btn--active' : ''}`}
                      onClick={() => setPreviewDevice('desktop')}
                      title="Desktop View"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                        <line x1="8" y1="21" x2="16" y2="21" />
                        <line x1="12" y1="17" x2="12" y2="21" />
                      </svg>
                      Desktop
                    </button>
                    <button
                      type="button"
                      className={`admin-newsletter__device-btn ${previewDevice === 'mobile' ? 'admin-newsletter__device-btn--active' : ''}`}
                      onClick={() => setPreviewDevice('mobile')}
                      title="Mobile View"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                        <line x1="12" y1="18" x2="12.01" y2="18" />
                      </svg>
                      Mobile
                    </button>
                  </div>
                </div>

                {/* Email Meta Info bar */}
                <div className="admin-newsletter__email-meta">
                  <div className="admin-newsletter__meta-row">
                    <span className="admin-newsletter__meta-label">Subject:</span>
                    <span className="admin-newsletter__meta-value admin-newsletter__meta-subject">
                      {form.subject || <span className="admin-newsletter__placeholder">(No subject)</span>}
                    </span>
                  </div>
                  {form.preheader && (
                    <div className="admin-newsletter__meta-row">
                      <span className="admin-newsletter__meta-label">Preview:</span>
                      <span className="admin-newsletter__meta-value admin-newsletter__meta-snippet">
                        {form.preheader}
                      </span>
                    </div>
                  )}
                  <div className="admin-newsletter__meta-row">
                    <span className="admin-newsletter__meta-label">From:</span>
                    <span className="admin-newsletter__meta-value">
                      {form.senderName || 'Rednest'} &lt;noreply@rednest.com&gt;
                    </span>
                  </div>
                </div>

                {/* Simulator Device Frame */}
                <div className={`admin-newsletter__simulator-frame admin-newsletter__simulator-frame--${previewDevice}`}>
                  <div className="admin-newsletter__email-wrapper">
                    {/* Header Logo */}
                    <div className="admin-newsletter__email-header">
                      <h1 className="admin-newsletter__email-brand">REDNEST</h1>
                      <div className="admin-newsletter__email-subbrand">Exclusive Member Newsletter</div>
                    </div>

                    {/* Email Body Container */}
                    <div className="admin-newsletter__email-body">
                      {form.badge && (
                        <div className="admin-newsletter__email-badge">
                          {form.badge}
                        </div>
                      )}

                      {form.heading && (
                        <h2 className="admin-newsletter__email-heading">
                          {form.heading.replace(/{name}/g, user?.name || 'Alex')}
                        </h2>
                      )}

                      <div
                        className="admin-newsletter__email-html-content"
                        dangerouslySetInnerHTML={{ __html: previewHtml }}
                      />

                      {form.buttonText && (
                        <div className="admin-newsletter__email-cta-wrap">
                          <a
                            href={form.buttonUrl || '#'}
                            onClick={(e) => e.preventDefault()}
                            className="admin-newsletter__email-btn"
                          >
                            {form.buttonText}
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="admin-newsletter__email-footer">
                      <p>You are receiving this email because you subscribed to the Rednest Club updates.</p>
                      <p>&copy; {new Date().getFullYear()} Rednest. All rights reserved.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 2: SUBSCRIBERS LIST */}
        {activeTab === 'subscribers' && (
          <motion.div
            className="admin-newsletter__subscribers-view"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Search & Filter Controls */}
            <div className="admin-newsletter__controls-card">
              <div className="admin-newsletter__search-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  className="admin-newsletter__search-input"
                  placeholder="Search subscribers by name or email..."
                  value={subscribersSearch}
                  onChange={(e) => setSubscribersSearch(e.target.value)}
                />
                {subscribersSearch && (
                  <button className="admin-newsletter__clear-btn" onClick={() => setSubscribersSearch('')}>
                    &times;
                  </button>
                )}
              </div>

              <div className="admin-newsletter__filter-group">
                <select
                  className="admin-newsletter__select"
                  value={subscribersFilter}
                  onChange={(e) => setSubscribersFilter(e.target.value)}
                >
                  <option value="all">All Subscribers</option>
                  <option value="subscribed">Subscribed Only</option>
                  <option value="unsubscribed">Unsubscribed</option>
                  <option value="active">Active Accounts</option>
                </select>
              </div>
            </div>

            {/* Subscribers Table */}
            <div className="admin-newsletter__table-container">
              {subscribersLoading ? (
                <div className="admin-newsletter__empty-state">
                  <img src={loaderIconRed} alt="Loading..." className="admin-newsletter__loader-large" />
                  <p>Loading subscriber list...</p>
                </div>
              ) : filteredSubscribers.length === 0 ? (
                <div className="admin-newsletter__empty-state">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <line x1="18" y1="8" x2="23" y2="13" />
                    <line x1="23" y1="8" x2="18" y2="13" />
                  </svg>
                  <h3>No subscribers found</h3>
                  <p>No user accounts matched your current search or filter criteria.</p>
                </div>
              ) : (
                <table className="admin-newsletter__table">
                  <thead>
                    <tr>
                      <th>Subscriber</th>
                      <th>Role</th>
                      <th>Registered</th>
                      <th>Orders & Spent</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubscribers.map((sub, idx) => (
                      <motion.tr
                        key={sub.id}
                        variants={fadeUp}
                        initial="hidden"
                        animate="show"
                        custom={idx}
                      >
                        <td>
                          <div className="admin-newsletter__user-cell">
                            {sub.profilePictureUrl ? (
                              <img
                                src={sub.profilePictureUrl}
                                alt={sub.name || 'User'}
                                className="admin-newsletter__user-avatar"
                              />
                            ) : (
                              <div className="admin-newsletter__user-avatar-initials">
                                {getInitials(sub.name, sub.email)}
                              </div>
                            )}
                            <div className="admin-newsletter__user-info">
                              <span className="admin-newsletter__user-name">{sub.name || 'Anonymous User'}</span>
                              <span className="admin-newsletter__user-email">{sub.email}</span>
                              <button
                                className="admin-newsletter__copy-id"
                                onClick={() => handleCopy(sub.id, sub.id)}
                                title="Copy ID"
                              >
                                <code>{sub.id.slice(0, 8)}...</code>
                                {copiedId === sub.id ? (
                                  <span className="copied-tag">Copied!</span>
                                ) : (
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                  </svg>
                                )}
                              </button>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className="admin-newsletter__role-badge">
                            {sub.role || 'Customer'}
                          </span>
                        </td>

                        <td>
                          <span className="admin-newsletter__date">{formatDate(sub.createdAt)}</span>
                        </td>

                        <td>
                          <div className="admin-newsletter__orders-stat">
                            <span>{sub.ordersCount} orders</span>
                            <span className="admin-newsletter__spent-tag">₼ {sub.totalSpent.toFixed(2)}</span>
                          </div>
                        </td>

                        <td>
                          <span
                            className={`admin-newsletter__status-badge ${
                              sub.subscribe
                                ? 'admin-newsletter__status-badge--success'
                                : 'admin-newsletter__status-badge--muted'
                            }`}
                          >
                            {sub.subscribe ? 'Subscribed' : 'Unsubscribed'}
                          </span>
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <button
                            className={`admin-newsletter__toggle-btn ${
                              sub.subscribe ? 'admin-newsletter__toggle-btn--unsubscribe' : 'admin-newsletter__toggle-btn--subscribe'
                            }`}
                            disabled={togglingUserId === sub.id}
                            onClick={() => handleToggleSubscriber(sub.id)}
                            title={sub.subscribe ? 'Unsubscribe user' : 'Subscribe user'}
                          >
                            {togglingUserId === sub.id ? (
                              <img src={loaderIcon} alt="Loading..." className="admin-newsletter__loader-mini" />
                            ) : sub.subscribe ? (
                              'Unsubscribe'
                            ) : (
                              'Subscribe'
                            )}
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </motion.div>
        )}

        {/* TAB 3: BROADCAST HISTORY */}
        {activeTab === 'history' && (
          <motion.div
            className="admin-newsletter__history-view"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {historyLoading ? (
              <div className="admin-newsletter__empty-state">
                <img src={loaderIconRed} alt="Loading..." className="admin-newsletter__loader-large" />
                <p>Loading broadcast logs...</p>
              </div>
            ) : history.length === 0 ? (
              <div className="admin-newsletter__empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
                <h3>No broadcasts yet</h3>
                <p>You haven't sent any email newsletters yet. Compose your first campaign to get started!</p>
                <button
                  className="admin-newsletter__btn-primary"
                  onClick={() => setActiveTab('compose')}
                  style={{ marginTop: '16px' }}
                >
                  Compose Campaign
                </button>
              </div>
            ) : (
              <div className="admin-newsletter__history-list">
                {history.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    className="admin-newsletter__history-card"
                    variants={fadeUp}
                    initial="hidden"
                    animate="show"
                    custom={idx}
                  >
                    <div className="admin-newsletter__history-main">
                      <div className="admin-newsletter__history-top">
                        {item.badge && (
                          <span className="admin-newsletter__history-badge-tag">{item.badge}</span>
                        )}
                        <span
                          className={`admin-newsletter__status-badge ${
                            item.status === 'Sent'
                              ? 'admin-newsletter__status-badge--success'
                              : item.status === 'PartiallySent'
                              ? 'admin-newsletter__status-badge--warning'
                              : 'admin-newsletter__status-badge--danger'
                          }`}
                        >
                          {item.status}
                        </span>
                        <span className="admin-newsletter__history-date">
                          {formatDate(item.createdAt)} ({formatRelativeTime(item.createdAt)})
                        </span>
                      </div>

                      <h3 className="admin-newsletter__history-subject">{item.subject}</h3>
                      {item.preheader && (
                        <p className="admin-newsletter__history-snippet">{item.preheader}</p>
                      )}

                      <div className="admin-newsletter__history-stats-bar">
                        <div className="admin-newsletter__stat-pill">
                          <span className="admin-newsletter__stat-pill-label">Recipients:</span>
                          <span className="admin-newsletter__stat-pill-val">{item.recipientCount}</span>
                        </div>
                        <div className="admin-newsletter__stat-pill">
                          <span className="admin-newsletter__stat-pill-label">Delivered:</span>
                          <span className="admin-newsletter__stat-pill-val" style={{ color: '#34d399' }}>
                            {item.successCount}
                          </span>
                        </div>
                        {item.failedCount > 0 && (
                          <div className="admin-newsletter__stat-pill">
                            <span className="admin-newsletter__stat-pill-label">Failed:</span>
                            <span className="admin-newsletter__stat-pill-val" style={{ color: '#f87171' }}>
                              {item.failedCount}
                            </span>
                          </div>
                        )}
                        <div className="admin-newsletter__stat-pill">
                          <span className="admin-newsletter__stat-pill-label">Sent By:</span>
                          <span className="admin-newsletter__stat-pill-val">{item.sentByAdminName || 'Admin'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="admin-newsletter__history-actions">
                      <button
                        className="admin-newsletter__btn-outline-sm"
                        onClick={() => handleLoadIntoComposer(item)}
                        title="Load into Composer"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Reuse
                      </button>

                      <button
                        className="admin-newsletter__btn-danger-sm"
                        onClick={() => setItemToDelete(item)}
                        title="Delete Broadcast Log"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* MODAL 1: SEND TEST PREVIEW */}
        <AnimatePresence>
          {isTestModalOpen && (
            <div className="admin-newsletter__modal-overlay" onClick={() => setIsTestModalOpen(false)}>
              <motion.div
                className="admin-newsletter__modal"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="admin-newsletter__modal-header">
                  <h3>Send Test Email Preview</h3>
                  <button className="admin-newsletter__modal-close" onClick={() => setIsTestModalOpen(false)}>
                    &times;
                  </button>
                </div>

                <form onSubmit={handleSendTest} className="admin-newsletter__modal-body">
                  <p className="admin-newsletter__modal-desc">
                    Send a real rendered test preview to your personal inbox to inspect formatting, images, and responsiveness before sending to customers.
                  </p>

                  <div className="admin-newsletter__form-group">
                    <label className="admin-newsletter__form-label">Recipient Test Email</label>
                    <input
                      type="email"
                      required
                      className="admin-newsletter__input"
                      value={testEmailInput}
                      onChange={(e) => setTestEmailInput(e.target.value)}
                      placeholder="e.g. your-email@example.com"
                    />
                  </div>

                  <div className="admin-newsletter__modal-actions">
                    <button
                      type="button"
                      className="admin-newsletter__btn-secondary"
                      onClick={() => setIsTestModalOpen(false)}
                      disabled={isSendingTest}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="admin-newsletter__btn-primary"
                      disabled={isSendingTest}
                    >
                      {isSendingTest ? (
                        <>
                          <img src={loaderIcon} alt="Sending..." className="admin-newsletter__loader-mini" />
                          Sending Test...
                        </>
                      ) : (
                        'Send Test Email'
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL 2: CONFIRM BROADCAST */}
        <AnimatePresence>
          {isBroadcastModalOpen && (
            <div className="admin-newsletter__modal-overlay" onClick={() => !isBroadcasting && setIsBroadcastModalOpen(false)}>
              <motion.div
                className="admin-newsletter__modal admin-newsletter__modal--danger"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="admin-newsletter__modal-header">
                  <div className="admin-newsletter__danger-header-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    Confirm Newsletter Broadcast
                  </div>
                  {!isBroadcasting && (
                    <button className="admin-newsletter__modal-close" onClick={() => setIsBroadcastModalOpen(false)}>
                      &times;
                    </button>
                  )}
                </div>

                <div className="admin-newsletter__modal-body">
                  <p className="admin-newsletter__modal-desc">
                    You are about to broadcast this email newsletter to all <strong>{stats.totalSubscribers} active subscribed members</strong>.
                  </p>

                  <div className="admin-newsletter__confirm-summary">
                    <div className="admin-newsletter__confirm-row">
                      <span>Subject:</span>
                      <strong>{form.subject}</strong>
                    </div>
                    <div className="admin-newsletter__confirm-row">
                      <span>Recipients:</span>
                      <strong>{stats.totalSubscribers} active subscribers</strong>
                    </div>
                    <div className="admin-newsletter__confirm-row">
                      <span>Sender:</span>
                      <strong>{form.senderName || 'Rednest'} &lt;noreply@rednest.com&gt;</strong>
                    </div>
                  </div>

                  <div className="admin-newsletter__safety-check">
                    <label className="admin-newsletter__checkbox-label">
                      <input
                        type="checkbox"
                        checked={confirmedSafety}
                        onChange={(e) => setConfirmedSafety(e.target.checked)}
                        disabled={isBroadcasting}
                      />
                      <span>I understand that this action will immediately send emails to all subscribed users and cannot be undone.</span>
                    </label>
                  </div>

                  <div className="admin-newsletter__modal-actions">
                    <button
                      type="button"
                      className="admin-newsletter__btn-secondary"
                      onClick={() => setIsBroadcastModalOpen(false)}
                      disabled={isBroadcasting}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="admin-newsletter__btn-danger"
                      onClick={handleBroadcast}
                      disabled={!confirmedSafety || isBroadcasting}
                    >
                      {isBroadcasting ? (
                        <>
                          <img src={loaderIcon} alt="Sending..." className="admin-newsletter__loader-mini" />
                          Broadcasting to {stats.totalSubscribers} Members...
                        </>
                      ) : (
                        'Yes, Send Broadcast Now'
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL 3: DELETE CONFIRMATION */}
        <AnimatePresence>
          {itemToDelete && (
            <div className="admin-newsletter__modal-overlay" onClick={() => !isDeleting && setItemToDelete(null)}>
              <motion.div
                className="admin-newsletter__modal"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="admin-newsletter__modal-header">
                  <h3>Delete Broadcast Record</h3>
                  <button className="admin-newsletter__modal-close" onClick={() => setItemToDelete(null)}>
                    &times;
                  </button>
                </div>

                <div className="admin-newsletter__modal-body">
                  <p className="admin-newsletter__modal-desc">
                    Are you sure you want to delete the broadcast log for "<strong>{itemToDelete.subject}</strong>"? This log entry will be permanently removed.
                  </p>

                  <div className="admin-newsletter__modal-actions">
                    <button
                      type="button"
                      className="admin-newsletter__btn-secondary"
                      onClick={() => setItemToDelete(null)}
                      disabled={isDeleting}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="admin-newsletter__btn-danger"
                      onClick={handleDeleteHistory}
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <>
                          <img src={loaderIcon} alt="Deleting..." className="admin-newsletter__loader-mini" />
                          Deleting...
                        </>
                      ) : (
                        'Delete Record'
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
};

export default Newsletter;

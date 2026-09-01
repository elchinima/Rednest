import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AdminLayout from '../AdminLayout/AdminLayout';
import { fetchWithRefresh } from '../../../utils/fetchWithRefresh';
import { useAuth } from '../../../context/AuthContext';
import loaderIcon from '../../../assets/icons/loader-animated.svg';
import loaderIconRed from '../../../assets/icons/loader-animated-red.svg';
import './Newsletter.scss';

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

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.35, ease: [0.16, 1, 0.3, 1] },
  }),
};

const Newsletter = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('compose');

  const [stats, setStats] = useState({
    totalSubscribers: 0,
    totalCampaigns: 0,
    totalDelivered: 0,
    lastBroadcast: null,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  const [subscribers, setSubscribers] = useState([]);
  const [subscribersLoading, setSubscribersLoading] = useState(false);
  const [subscribersSearch, setSubscribersSearch] = useState('');
  const [subscribersFilter, setSubscribersFilter] = useState('all');

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const baseUrl = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '';

  const [form, setForm] = useState({
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
    buttonUrl: baseUrl ? `${baseUrl}/catalog` : '/catalog',
    senderName: 'Rednest Coffee',
  });
  const [previewDevice, setPreviewDevice] = useState('desktop');

  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testEmailInput, setTestEmailInput] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);

  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [confirmedSafety, setConfirmedSafety] = useState(false);

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

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const res = await fetchWithRefresh(`${apiUrl}/api/admin/newsletter/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setStatsLoading(false);
    }
  }, [apiUrl]);

  const fetchSubscribers = useCallback(async () => {
    try {
      setSubscribersLoading(true);
      const res = await fetchWithRefresh(`${apiUrl}/api/admin/newsletter/subscribers`);
      if (res.ok) {
        const data = await res.json();
        setSubscribers(data || []);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to load subscribers.', 'error');
    } finally {
      setSubscribersLoading(false);
    }
  }, [apiUrl]);

  const fetchHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const res = await fetchWithRefresh(`${apiUrl}/api/admin/newsletter/history`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data || []);
      }
    } catch (err) {
      console.error(err);
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

  const handleInsertTag = (tag) => {
    setForm((prev) => ({
      ...prev,
      bodyHtml: prev.bodyHtml + tag,
    }));
  };

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
    setActiveTab('compose');
    showToast('Campaign loaded into composer.');
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

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

  const replaceTags = useCallback((text) => {
    if (!text) return '';
    const safeRecipientName = user?.name || user?.Name || 'Alex Rivers';
    const safeRecipientEmail = user?.email || user?.Email || 'member@rednest.com';
    const year = new Date().getFullYear().toString();
    return text
      .replace(/\{name\}/gi, safeRecipientName)
      .replace(/\{email\}/gi, safeRecipientEmail)
      .replace(/\{year\}/gi, year);
  }, [user]);

  const previewHtml = useMemo(() => {
    let body = form.bodyHtml || '<p style="color:rgba(255,255,255,0.4);">No content entered yet...</p>';
    return replaceTags(body);
  }, [form.bodyHtml, replaceTags]);

  return (
    <AdminLayout>
      <div className="admin-newsletter">
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

        <div className="admin-newsletter__header">
          <div>
            <h1 className="admin-newsletter__title">Newsletter</h1>
            <p className="admin-newsletter__subtitle">
              Compose, preview, and broadcast emails to active Rednest Club subscribers.
            </p>
          </div>

          <div className="admin-newsletter__header-actions">
            {activeTab !== 'compose' && (
              <button
                className="admin-newsletter__btn-primary"
                onClick={() => setActiveTab('compose')}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                New Campaign
              </button>
            )}
          </div>
        </div>

        <div className="admin-newsletter__stats">
          <div className="admin-newsletter__stat-card">
            <div className="admin-newsletter__stat-icon" style={{ '--accent': '#38bdf8' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div className="admin-newsletter__stat-body">
              <span className="admin-newsletter__stat-value">
                {statsLoading ? <img src={loaderIcon} alt="Loading..." className="admin-newsletter__loader-mini" /> : stats.totalSubscribers.toLocaleString()}
              </span>
              <span className="admin-newsletter__stat-label">Active Subscribers</span>
              <span className="admin-newsletter__stat-sub">Users with newsletter active</span>
            </div>
          </div>

          <div className="admin-newsletter__stat-card">
            <div className="admin-newsletter__stat-icon" style={{ '--accent': '#f87171' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <div className="admin-newsletter__stat-body">
              <span className="admin-newsletter__stat-value">
                {statsLoading ? <img src={loaderIcon} alt="Loading..." className="admin-newsletter__loader-mini" /> : stats.totalCampaigns.toLocaleString()}
              </span>
              <span className="admin-newsletter__stat-label">Total Broadcasts</span>
              <span className="admin-newsletter__stat-sub">Campaigns sent</span>
            </div>
          </div>

          <div className="admin-newsletter__stat-card">
            <div className="admin-newsletter__stat-icon" style={{ '--accent': '#34d399' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <div className="admin-newsletter__stat-body">
              <span className="admin-newsletter__stat-value">
                {statsLoading ? <img src={loaderIcon} alt="Loading..." className="admin-newsletter__loader-mini" /> : stats.totalDelivered.toLocaleString()}
              </span>
              <span className="admin-newsletter__stat-label">Delivered Emails</span>
              <span className="admin-newsletter__stat-sub">Recipients reached</span>
            </div>
          </div>

          <div className="admin-newsletter__stat-card">
            <div className="admin-newsletter__stat-icon" style={{ '--accent': '#c084fc' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div className="admin-newsletter__stat-body">
              <span className="admin-newsletter__stat-value" style={{ fontSize: stats.lastBroadcast ? '1.15rem' : '1.35rem' }}>
                {statsLoading ? <img src={loaderIcon} alt="Loading..." className="admin-newsletter__loader-mini" /> : (stats.lastBroadcast ? formatRelativeTime(stats.lastBroadcast) : 'None')}
              </span>
              <span className="admin-newsletter__stat-label">Last Broadcast</span>
              <span className="admin-newsletter__stat-sub">
                {stats.lastBroadcast ? formatDate(stats.lastBroadcast) : 'Ready to send'}
              </span>
            </div>
          </div>
        </div>

        <div className="admin-newsletter__controls">
          <div className="admin-newsletter__tabs">
            <button
              className={`admin-newsletter__tab ${activeTab === 'compose' ? 'active' : ''}`}
              onClick={() => setActiveTab('compose')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              Compose & Broadcast
            </button>

            <button
              className={`admin-newsletter__tab ${activeTab === 'subscribers' ? 'active' : ''}`}
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
              className={`admin-newsletter__tab ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              Broadcast History ({stats.totalCampaigns})
            </button>
          </div>
        </div>

        {activeTab === 'compose' && (
          <div className="admin-newsletter__compose-grid">
            <div className="admin-newsletter__panel">
              <div className="admin-newsletter__panel-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Email Details
              </div>

              <div className="admin-newsletter__form-group">
                <label>Subject Line <span className="req">*</span></label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="e.g. 🎁 Exclusive 20% Discount for Rednest Members"
                />
              </div>

              <div className="admin-newsletter__form-row">
                <div className="admin-newsletter__form-group">
                  <label>Preheader Snippet</label>
                  <input
                    type="text"
                    value={form.preheader}
                    onChange={(e) => setForm({ ...form, preheader: e.target.value })}
                    placeholder="Short preview in email list"
                  />
                </div>

                <div className="admin-newsletter__form-group">
                  <label>Sender Name</label>
                  <input
                    type="text"
                    value={form.senderName}
                    onChange={(e) => setForm({ ...form, senderName: e.target.value })}
                    placeholder="e.g. Rednest Coffee"
                  />
                </div>
              </div>

              <div className="admin-newsletter__form-row">
                <div className="admin-newsletter__form-group">
                  <label>Header Badge Tag</label>
                  <input
                    type="text"
                    value={form.badge}
                    onChange={(e) => setForm({ ...form, badge: e.target.value })}
                    placeholder="e.g. SPECIAL OFFER, NEW ARRIVAL"
                  />
                </div>

                <div className="admin-newsletter__form-group">
                  <label>Inner Title Heading</label>
                  <input
                    type="text"
                    value={form.heading}
                    onChange={(e) => setForm({ ...form, heading: e.target.value })}
                    placeholder="e.g. A Special Treat For You, {name}!"
                  />
                </div>
              </div>

              <div className="admin-newsletter__form-group">
                <div className="admin-newsletter__tags-header">
                  <label>Message Body (HTML Supported) <span className="req">*</span></label>
                  <div className="admin-newsletter__tags-list">
                    <span className="tags-label">Tags:</span>
                    <button type="button" className="tag-pill" onClick={() => handleInsertTag('{name}')}>
                      +{'{name}'}
                    </button>
                    <button type="button" className="tag-pill" onClick={() => handleInsertTag('{email}')}>
                      +{'{email}'}
                    </button>
                    <button type="button" className="tag-pill" onClick={() => handleInsertTag('{year}')}>
                      +{'{year}'}
                    </button>
                  </div>
                </div>

                <textarea
                  rows={9}
                  value={form.bodyHtml}
                  onChange={(e) => setForm({ ...form, bodyHtml: e.target.value })}
                  placeholder="Enter HTML or plain formatted text for the email body..."
                />
              </div>

              <div className="admin-newsletter__cta-fieldset">
                <div className="cta-title">Call-To-Action Button (Optional)</div>
                <div className="admin-newsletter__form-row">
                  <div className="admin-newsletter__form-group">
                    <label>Button Text</label>
                    <input
                      type="text"
                      value={form.buttonText}
                      onChange={(e) => setForm({ ...form, buttonText: e.target.value })}
                      placeholder="e.g. Order Online Now"
                    />
                  </div>
                  <div className="admin-newsletter__form-group">
                    <label>Target URL</label>
                    <input
                      type="text"
                      value={form.buttonUrl}
                      onChange={(e) => setForm({ ...form, buttonUrl: e.target.value })}
                      placeholder={`e.g. ${baseUrl ? `${baseUrl}/catalog` : 'https://rednest.onrender.com/catalog'}`}
                    />
                  </div>
                </div>
              </div>

              <div className="admin-newsletter__form-bottom">
                <button
                  type="button"
                  className="admin-newsletter__btn-secondary"
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

            <div className="admin-newsletter__preview-panel">
              <div className="admin-newsletter__preview-top">
                <div className="preview-heading">
                  <span className="live-indicator" />
                  Live Email Simulator
                </div>

                <div className="preview-toggle">
                  <button
                    type="button"
                    className={`toggle-btn ${previewDevice === 'desktop' ? 'active' : ''}`}
                    onClick={() => setPreviewDevice('desktop')}
                  >
                    Desktop
                  </button>
                  <button
                    type="button"
                    className={`toggle-btn ${previewDevice === 'mobile' ? 'active' : ''}`}
                    onClick={() => setPreviewDevice('mobile')}
                  >
                    Mobile
                  </button>
                </div>
              </div>

              <div className="admin-newsletter__meta-box">
                <div className="meta-line">
                  <span className="meta-lbl">Subject:</span>
                  <span className="meta-txt subject">{replaceTags(form.subject) || '(No subject)'}</span>
                </div>
                {form.preheader && (
                  <div className="meta-line">
                    <span className="meta-lbl">Snippet:</span>
                    <span className="meta-txt snippet">{replaceTags(form.preheader)}</span>
                  </div>
                )}
                <div className="meta-line">
                  <span className="meta-lbl">From:</span>
                  <span className="meta-txt">{form.senderName || 'Rednest'} &lt;myrednest@gmail.com&gt;</span>
                </div>
              </div>

              <div className={`admin-newsletter__frame admin-newsletter__frame--${previewDevice}`}>
                <div className="email-canvas">
                  <div className="email-header-art">
                    <h1 className="email-logo">REDNEST</h1>
                    <div className="email-sublogo">Exclusive Member Newsletter</div>
                  </div>

                  <div className="email-body-area">
                    {form.badge && <div className="email-badge-pill">{replaceTags(form.badge)}</div>}
                    {form.heading && (
                      <h2 className="email-title">
                        {replaceTags(form.heading)}
                      </h2>
                    )}
                    <div
                      className="email-content-rendered"
                      dangerouslySetInnerHTML={{ __html: previewHtml }}
                    />
                    {form.buttonText && (
                      <div className="email-btn-wrap">
                        <a href={replaceTags(form.buttonUrl) || '#'} onClick={(e) => e.preventDefault()} className="email-btn">
                          {replaceTags(form.buttonText)}
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="email-foot-area">
                    <p>You are receiving this email because you subscribed to Rednest Club updates.</p>
                    <p>&copy; {new Date().getFullYear()} Rednest. All rights reserved.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'subscribers' && (
          <div className="admin-newsletter__subscribers-wrapper">
            <div className="admin-newsletter__sub-filter-bar">
              <div className="admin-newsletter__search-box">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Search subscribers by name or email..."
                  value={subscribersSearch}
                  onChange={(e) => setSubscribersSearch(e.target.value)}
                />
                {subscribersSearch && (
                  <button className="search-clear" onClick={() => setSubscribersSearch('')}>
                    &times;
                  </button>
                )}
              </div>

              <div className="admin-newsletter__select-box">
                <select
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

            <div className="admin-newsletter__table-card">
              {subscribersLoading ? (
                <div className="admin-newsletter__empty-box">
                  <img src={loaderIconRed} alt="Loading..." className="admin-newsletter__loader-large" />
                  <p>Loading subscriber list...</p>
                </div>
              ) : filteredSubscribers.length === 0 ? (
                <div className="admin-newsletter__empty-box">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <line x1="18" y1="8" x2="23" y2="13" />
                    <line x1="23" y1="8" x2="18" y2="13" />
                  </svg>
                  <h3>No subscribers found</h3>
                  <p>No user accounts match your current filter or search query.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Subscriber</th>
                        <th>Role</th>
                        <th style={{ textAlign: 'right' }}>Status</th>
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
                            <div className="user-cell">
                              {sub.profilePictureUrl ? (
                                <img
                                  src={sub.profilePictureUrl}
                                  alt={sub.name || 'User'}
                                  className="user-avatar"
                                />
                              ) : (
                                <div className="user-initials">
                                  {getInitials(sub.name, sub.email)}
                                </div>
                              )}
                              <div className="user-details">
                                <span className="name">{sub.name || 'Anonymous User'}</span>
                                <span className="email">{sub.email}</span>
                                <button
                                  className="copy-btn"
                                  onClick={() => handleCopy(sub.id, sub.id)}
                                  title="Copy User ID"
                                >
                                  <code>{sub.id.slice(0, 8)}...</code>
                                  {copiedId === sub.id ? (
                                    <span className="copied-text">Copied!</span>
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
                            <span className="badge badge--muted">
                              {sub.role || 'Customer'}
                            </span>
                          </td>

                          <td style={{ textAlign: 'right' }}>
                            <span
                              className={`badge ${
                                sub.subscribe ? 'badge--success' : 'badge--muted'
                              }`}
                            >
                              {sub.subscribe ? 'Subscribed' : 'Unsubscribed'}
                            </span>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="admin-newsletter__history-wrapper">
            {historyLoading ? (
              <div className="admin-newsletter__empty-box">
                <img src={loaderIconRed} alt="Loading..." className="admin-newsletter__loader-large" />
                <p>Loading campaign history...</p>
              </div>
            ) : history.length === 0 ? (
              <div className="admin-newsletter__empty-box">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
                <h3>No broadcasts yet</h3>
                <p>You haven't sent any email newsletters yet. Compose your first campaign to get started.</p>
                <button
                  className="admin-newsletter__btn-primary"
                  onClick={() => setActiveTab('compose')}
                  style={{ marginTop: '16px' }}
                >
                  Compose Campaign
                </button>
              </div>
            ) : (
              <div className="admin-newsletter__history-cards">
                {history.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    className="admin-newsletter__history-item"
                    variants={fadeUp}
                    initial="hidden"
                    animate="show"
                    custom={idx}
                  >
                    <div className="item-main">
                      <div className="item-meta-top">
                        {item.badge && <span className="item-badge">{item.badge}</span>}
                        <span
                          className={`badge ${
                            item.status === 'Sent'
                              ? 'badge--success'
                              : item.status === 'PartiallySent'
                              ? 'badge--warning'
                              : 'badge--danger'
                          }`}
                        >
                          {item.status}
                        </span>
                        <span className="item-date">
                          {formatDate(item.createdAt)} ({formatRelativeTime(item.createdAt)})
                        </span>
                      </div>

                      <h3 className="item-subject">{item.subject}</h3>
                      {item.preheader && <p className="item-snippet">{item.preheader}</p>}

                      <div className="item-pills-bar">
                        <div className="pill">
                          <span className="lbl">Recipients:</span>
                          <span className="val">{item.recipientCount}</span>
                        </div>
                        <div className="pill">
                          <span className="lbl">Delivered:</span>
                          <span className="val success">{item.successCount}</span>
                        </div>
                        {item.failedCount > 0 && (
                          <div className="pill">
                            <span className="lbl">Failed:</span>
                            <span className="val danger">{item.failedCount}</span>
                          </div>
                        )}
                        <div className="pill">
                          <span className="lbl">Sent By:</span>
                          <span className="val">{item.sentByAdminName || 'Admin'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="item-actions">
                      <button
                        className="admin-newsletter__btn-secondary-sm"
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
                        title="Delete Record"
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
          </div>
        )}

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
                  <h3 className="admin-newsletter__modal-title">Send Test Preview</h3>
                  <button className="admin-newsletter__modal-close" onClick={() => setIsTestModalOpen(false)}>
                    &times;
                  </button>
                </div>

                <form onSubmit={handleSendTest} className="admin-newsletter__modal-body">
                  <p className="modal-description">
                    Send a real rendered test email to your inbox to inspect visual styling, typography, and buttons before broadcasting.
                  </p>

                  <div className="admin-newsletter__form-group">
                    <label>Recipient Test Email</label>
                    <input
                      type="email"
                      required
                      value={testEmailInput}
                      onChange={(e) => setTestEmailInput(e.target.value)}
                      placeholder="e.g. your-email@example.com"
                    />
                  </div>

                  <div className="admin-newsletter__modal-footer">
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
                          Sending...
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
                  <h3 className="admin-newsletter__modal-title danger-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    Confirm Broadcast
                  </h3>
                  {!isBroadcasting && (
                    <button className="admin-newsletter__modal-close" onClick={() => setIsBroadcastModalOpen(false)}>
                      &times;
                    </button>
                  )}
                </div>

                <div className="admin-newsletter__modal-body">
                  <p className="modal-description">
                    You are about to broadcast this email newsletter to all <strong>{stats.totalSubscribers} active members</strong>.
                  </p>

                  <div className="admin-newsletter__summary-card">
                    <div className="summary-row">
                      <span>Subject:</span>
                      <strong>{form.subject}</strong>
                    </div>
                    <div className="summary-row">
                      <span>Subscribers:</span>
                      <strong>{stats.totalSubscribers} members</strong>
                    </div>
                    <div className="summary-row">
                      <span>Sender:</span>
                      <strong>{form.senderName || 'Rednest'} &lt;myrednest@gmail.com&gt;</strong>
                    </div>
                  </div>

                  <div className="admin-newsletter__safety-card">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={confirmedSafety}
                        onChange={(e) => setConfirmedSafety(e.target.checked)}
                        disabled={isBroadcasting}
                      />
                      <span>I understand that this action will immediately send emails to all subscribed users and cannot be undone.</span>
                    </label>
                  </div>

                  <div className="admin-newsletter__modal-footer">
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
                  <h3 className="admin-newsletter__modal-title">Delete Broadcast Record</h3>
                  <button className="admin-newsletter__modal-close" onClick={() => setItemToDelete(null)}>
                    &times;
                  </button>
                </div>

                <div className="admin-newsletter__modal-body">
                  <p className="modal-description">
                    Are you sure you want to delete the broadcast log for "<strong>{itemToDelete.subject}</strong>"? This log entry will be permanently removed.
                  </p>

                  <div className="admin-newsletter__modal-footer">
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

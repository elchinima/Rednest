import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AdminLayout from '../AdminLayout/AdminLayout';
import { fetchWithRefresh } from '../../../utils/fetchWithRefresh';
import { useAuth } from '../../../context/AuthContext';
import { useAdminAuth } from '../../../context/AdminAuthContext';
import loaderIcon from '../../../assets/icons/loader-animated.svg';
import loaderIconRed from '../../../assets/icons/loader-animated-red.svg';
import './Database.scss';

const cleanRole = (role) => (role || '').toLowerCase().replace(/\s+/g, '');

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];
const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const PAGE_SIZE = 8;

const formatSize = (kb) => {
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
};

const Database = () => {
  const { user } = useAuth();
  const { adminRole } = useAdminAuth();
  const [files, setFiles] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copiedUrl, setCopiedUrl] = useState('');
  const [deletingFile, setDeletingFile] = useState('');
  const [previewFile, setPreviewFile] = useState(null);
  const [fileToDelete, setFileToDelete] = useState(null);
  const inputRef = useRef(null);
  const apiUrl = import.meta.env.VITE_API_URL || '';

  const currentUserRole = cleanRole(adminRole || user?.role || user?.Role);
  const isSuperAdmin = currentUserRole === 'superadmin' || currentUserRole === 'super admin';

  const filteredFiles = useMemo(() => {
    let list = [...files];
    if (appliedSearch.trim()) {
      const q = appliedSearch.toLowerCase().trim();
      list = list.filter((f) => (f.fileName || '').toLowerCase().includes(q));
    }
    return list.sort((a, b) => (parseFloat(a.sizeKb) || 0) - (parseFloat(b.sizeKb) || 0));
  }, [files, appliedSearch]);

  const visibleFiles = useMemo(() => {
    return filteredFiles.slice(0, visibleCount);
  }, [filteredFiles, visibleCount]);

  const hasMore = visibleCount < filteredFiles.length;

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + PAGE_SIZE);
  };

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setAppliedSearch(searchInput.trim());
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setAppliedSearch(searchInput.trim());
    }
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setAppliedSearch('');
  };

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [appliedSearch]);

  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetchWithRefresh(`${apiUrl}/api/admin/files`);
      if (res.ok) {
        const data = await res.json();
        setFiles(data);
      }
    } catch {
      setError('Failed to load file list.');
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (fileToDelete && !deletingFile) {
          setFileToDelete(null);
        } else if (previewFile) {
          setPreviewFile(null);
        }
      }
    };
    if (previewFile || fileToDelete) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [previewFile, fileToDelete, deletingFile]);

  const showSuccess = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3500); };
  const showError   = (msg) => { setError(msg);   setTimeout(() => setError(''),   4000); };

  const validateFile = (file) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      showError(`"${file.name}" has an invalid format. Allowed: PNG, JPG, JPEG.`);
      return false;
    }
    if (file.size > MAX_SIZE_BYTES) {
      showError(`"${file.name}" exceeds ${MAX_SIZE_MB} MB.`);
      return false;
    }
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
    if (!nameWithoutExt || !/^[a-zA-Z0-9\s._\-()]+$/.test(nameWithoutExt) || !/[a-zA-Z0-9]/.test(nameWithoutExt)) {
      showError(`"${file.name}": File name must contain only English letters and numbers. Russian/Cyrillic characters are not supported.`);
      return false;
    }
    return true;
  };

  const uploadFile = async (file) => {
    if (!validateFile(file)) return;

    setUploading(true);
    setUploadProgress(0);
    setError('');

    const interval = setInterval(() => {
      setUploadProgress((p) => (p < 85 ? p + Math.random() * 12 : p));
    }, 200);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetchWithRefresh(`${apiUrl}/api/admin/upload`, {
        method: 'POST',
        body: formData,
      });

      clearInterval(interval);
      setUploadProgress(100);

      if (res.ok) {
        const data = await res.json();
        showSuccess(`Uploaded: ${data.fileName} (${formatSize(data.sizeKb)})`);
        await fetchFiles();
      } else {
        const data = await res.json().catch(() => ({}));
        showError(data.message || 'Upload failed.');
      }
    } catch {
      clearInterval(interval);
      showError('Connection error. Please try again.');
    } finally {
      setTimeout(() => { setUploading(false); setUploadProgress(0); }, 600);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  const handleFileInput = (e) => {
    const file = e.target.files[0];
    if (file) uploadFile(file);
    e.target.value = '';
  };

  const handleCopyUrl = async (url, fileName) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(fileName);
      setTimeout(() => setCopiedUrl(''), 2000);
    } catch {
      showError('Could not copy link to clipboard.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!fileToDelete) return;
    if (!isSuperAdmin) {
      showError('Access denied. Only Super Admin can delete database files.');
      setFileToDelete(null);
      return;
    }
    const fileName = fileToDelete.fileName;
    setDeletingFile(fileName);
    try {
      const res = await fetchWithRefresh(`${apiUrl}/api/admin/files/${encodeURIComponent(fileName)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showSuccess(`"${fileName}" deleted.`);
        setFiles((prev) => prev.filter((f) => f.fileName !== fileName));
        if (previewFile?.fileName === fileName) {
          setPreviewFile(null);
        }
        setFileToDelete(null);
      } else {
        const data = await res.json().catch(() => ({}));
        showError(data.message || 'Failed to delete file.');
      }
    } catch {
      showError('Connection error. Please try again.');
    } finally {
      setDeletingFile('');
    }
  };

  return (
    <AdminLayout>
      <div className="database">
        <motion.div
          className="database__header"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          <div>
            <h1 className="database__title">Database</h1>
            <p className="database__subtitle">Manage images in Supabase Storage</p>
          </div>
          <span className="database__bucket-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <ellipse cx="12" cy="5" rx="9" ry="3" />
              <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
              <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
            </svg>
            admin-files
          </span>
        </motion.div>

        <AnimatePresence>
          {error && (
            <motion.div
              className="database__alert database__alert--error"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </motion.div>
          )}
          {success && (
            <motion.div
              className="database__alert database__alert--success"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {success}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          id="database-dropzone"
          className={`database__dropzone${dragOver ? ' database__dropzone--over' : ''}${uploading ? ' database__dropzone--uploading' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && inputRef.current?.click()}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.45 }}
        >
          <input
            ref={inputRef}
            id="database-file-input"
            type="file"
            accept=".png,.jpg,.jpeg,image/png,image/jpeg"
            onChange={handleFileInput}
            style={{ display: 'none' }}
          />

          {uploading ? (
            <div className="database__upload-progress">
              <div className="database__progress-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="16 16 12 12 8 16" />
                  <line x1="12" y1="12" x2="12" y2="21" />
                  <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
                </svg>
              </div>
              <p className="database__progress-label">Compressing & uploading...</p>
              <div className="database__progress-bar">
                <motion.div
                  className="database__progress-fill"
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <span className="database__progress-pct">{Math.round(uploadProgress)}%</span>
            </div>
          ) : (
            <div className="database__dropzone-content">
              <div className={`database__dropzone-icon${dragOver ? ' database__dropzone-icon--over' : ''}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <polyline points="16 16 12 12 8 16" />
                  <line x1="12" y1="12" x2="12" y2="21" />
                  <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
                </svg>
              </div>
              <p className="database__dropzone-title">
                {dragOver ? 'Release to upload' : 'Drop an image here or click to browse'}
              </p>
              <p className="database__dropzone-hint">PNG, JPG, JPEG · max {MAX_SIZE_MB} MB · English file names only</p>
              <div className="database__dropzone-badges">
                <span className="database__badge">PNG</span>
                <span className="database__badge">JPG</span>
                <span className="database__badge">JPEG</span>
                <span className="database__badge">A-Z only</span>
                <span className="database__badge database__badge--arrow">→ WebP</span>
              </div>
            </div>
          )}
        </motion.div>

        <div className="database__files-header">
          <div className="database__files-header-left">
            <h2 className="database__files-title">
              Uploaded files
              {!loading && (
                <span className="database__files-count">
                  {visibleFiles.length} of {filteredFiles.length}
                </span>
              )}
            </h2>
          </div>

          <form className="database__search-wrap" onSubmit={handleSearchSubmit}>
            <svg className="database__search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              id="database-search-input"
              type="text"
              placeholder="Search by file name..."
              value={searchInput}
              onChange={(e) => {
                const val = e.target.value;
                setSearchInput(val);
                if (!val.trim() && appliedSearch) {
                  setAppliedSearch('');
                }
              }}
              onKeyDown={handleSearchKeyDown}
              className="database__search-input"
            />
            {searchInput && (
              <button
                type="button"
                className="database__search-clear"
                onClick={handleClearSearch}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </form>
        </div>

        {loading ? (
          <div className="database__loading">
            <img src={loaderIcon} alt="Loading..." className="database__spinner" />
            <span>Loading storage files...</span>
          </div>
        ) : files.length === 0 ? (
          <motion.div className="database__empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <p>No files uploaded yet</p>
          </motion.div>
        ) : filteredFiles.length === 0 ? (
          <motion.div className="database__empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <p>No files match "{appliedSearch}"</p>
            <button
              type="button"
              className="cta-btn sm"
              onClick={handleClearSearch}
              style={{ marginTop: '8px' }}
            >
              Clear Search
            </button>
          </motion.div>
        ) : (
          <>
            <motion.div
              className="database__grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
            >
              <AnimatePresence>
                {visibleFiles.map((file, i) => (
                  <motion.div
                    key={file.fileName}
                    className="database__file-card"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: i * 0.04, duration: 0.3 }}
                    layout
                  >
                    <div
                      className="database__file-img"
                      onClick={() => setPreviewFile(file)}
                      title="Click to view large preview"
                    >
                      <img src={file.publicUrl} alt={file.fileName} loading="lazy" decoding="async" />
                      <div className="database__file-img-overlay">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="11" cy="11" r="8" />
                          <line x1="21" y1="21" x2="16.65" y2="16.65" />
                          <line x1="11" y1="8" x2="11" y2="14" />
                          <line x1="8" y1="11" x2="14" y2="11" />
                        </svg>
                      </div>
                    </div>
                    <div className="database__file-info">
                      <p
                        className="database__file-name database__file-name--clickable"
                        onClick={() => setPreviewFile(file)}
                        title="Click to view large preview"
                      >
                        {file.fileName}
                      </p>
                      <div className="database__file-meta">
                        <span className="database__file-badge">WebP</span>
                        <span className="database__file-size">{formatSize(file.sizeKb)}</span>
                      </div>
                      <div className="database__file-actions">
                        <button
                          id={`database-copy-${i}`}
                          className={`database__file-btn database__file-btn--copy${copiedUrl === file.fileName ? ' database__file-btn--copied' : ''}`}
                          onClick={() => handleCopyUrl(file.publicUrl, file.fileName)}
                          title="Copy URL"
                        >
                          {copiedUrl === file.fileName ? (
                            <>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                              Copied
                            </>
                          ) : (
                            <>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                              </svg>
                              Copy URL
                            </>
                          )}
                        </button>
                        <button
                          id={`database-delete-${i}`}
                          className={`database__file-btn database__file-btn--delete${!isSuperAdmin ? ' database__file-btn--locked' : ''}`}
                          onClick={() => {
                            if (!isSuperAdmin) {
                              showError('Access denied. Only Super Admin can delete files.');
                            } else {
                              setFileToDelete(file);
                            }
                          }}
                          disabled={deletingFile === file.fileName}
                          title={isSuperAdmin ? 'Delete file' : 'Access denied (Super Admin only)'}
                        >
                          {isSuperAdmin ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                              <path d="M10 11v6M14 11v6" />
                              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                            </svg>
                          ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>

            {hasMore && (
              <div className="database__load-more-wrap">
                <button
                  id="database-load-more-btn"
                  type="button"
                  className="cta-btn secondary database__load-more-btn"
                  onClick={handleLoadMore}
                >
                  <span>Show More</span>
                  <span className="database__load-more-count">
                    ({filteredFiles.length - visibleCount} remaining)
                  </span>
                </button>
              </div>
            )}
          </>
        )}

      </div>

      <AnimatePresence>
        {previewFile && (
          <motion.div
            className="database-preview-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setPreviewFile(null)}
          >
            <motion.div
              className="database-preview-modal"
              initial={{ scale: 0.92, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 15 }}
              transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="database-preview-header">
                <div className="database-preview-title-wrap">
                  <h3 className="database-preview-filename" title={previewFile.fileName}>
                    {previewFile.fileName}
                  </h3>
                  <div className="database-preview-badges">
                    <span className="database__file-badge">WebP</span>
                    <span className="database__file-size">{formatSize(previewFile.sizeKb)}</span>
                  </div>
                </div>
                <button
                  className="database-preview-close"
                  onClick={() => setPreviewFile(null)}
                  aria-label="Close preview"
                  title="Close (Esc)"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div className="database-preview-img-container">
                <img
                  src={previewFile.publicUrl}
                  alt={previewFile.fileName}
                  className="database-preview-img"
                />
              </div>

              <div className="database-preview-footer">
                <div className="database-preview-url-box">
                  <span className="database-preview-url-text">{previewFile.publicUrl}</span>
                </div>
                <div className="database-preview-actions">
                  <button
                    className={`database-preview-btn database-preview-btn--copy${copiedUrl === previewFile.fileName ? ' database-preview-btn--copied' : ''}`}
                    onClick={() => handleCopyUrl(previewFile.publicUrl, previewFile.fileName)}
                  >
                    {copiedUrl === previewFile.fileName ? (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Copied URL
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                        Copy URL
                      </>
                    )}
                  </button>
                  <a
                    href={previewFile.publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="database-preview-btn database-preview-btn--external"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                    Open Original
                  </a>
                  <button
                    className={`database-preview-btn database-preview-btn--delete${!isSuperAdmin ? ' database-preview-btn--locked' : ''}`}
                    onClick={() => {
                      if (!isSuperAdmin) {
                        showError('Access denied. Only Super Admin can delete files.');
                      } else {
                        setFileToDelete(previewFile);
                      }
                    }}
                    title={isSuperAdmin ? 'Delete file' : 'Access denied (Super Admin only)'}
                  >
                    {isSuperAdmin ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6M14 11v6" />
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    )}
                    {isSuperAdmin ? 'Delete' : 'Delete (Super Admin only)'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {fileToDelete && (
          <motion.div
            className="database-delete-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => !deletingFile && setFileToDelete(null)}
          >
            <motion.div
              className="database-delete-modal"
              initial={{ scale: 0.92, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 15 }}
              transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="database-delete-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  <line x1="4" y1="6" x2="20" y2="6" />
                </svg>
              </div>

              <h3 className="database-delete-title">Delete File</h3>
              <p className="database-delete-desc">
                Are you sure you want to permanently delete this file from storage? This action cannot be undone.
              </p>

              <div className="database-delete-file-preview">
                <img
                  src={fileToDelete.publicUrl}
                  alt={fileToDelete.fileName}
                  className="database-delete-thumbnail"
                />
                <div className="database-delete-file-info">
                  <span className="database-delete-file-name" title={fileToDelete.fileName}>
                    {fileToDelete.fileName}
                  </span>
                  <span className="database-delete-file-size">
                    {formatSize(fileToDelete.sizeKb)} · WebP
                  </span>
                </div>
              </div>

              <div className="database-delete-actions">
                <button
                  id="database-cancel-delete-btn"
                  className="database-delete-btn database-delete-btn--cancel"
                  onClick={() => setFileToDelete(null)}
                  disabled={!!deletingFile}
                >
                  Cancel
                </button>
                <button
                  id="database-confirm-delete-btn"
                  className="database-delete-btn database-delete-btn--danger"
                  onClick={handleConfirmDelete}
                  disabled={!!deletingFile}
                >
                  {deletingFile ? (
                    <>
                      <img src={loaderIconRed} alt="Deleting..." style={{ width: 16, height: 16 }} />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6M14 11v6" />
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      </svg>
                      Delete
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
};

export default Database;

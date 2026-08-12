import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AdminLayout from '../AdminLayout/AdminLayout';
import './Database.scss';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];
const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

const formatSize = (kb) => {
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
};

const Database = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copiedUrl, setCopiedUrl] = useState('');
  const [deletingFile, setDeletingFile] = useState('');
  const inputRef = useRef(null);
  const apiUrl = import.meta.env.VITE_API_URL || '';

  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/api/admin/files`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setFiles(data);
      }
    } catch {
      setError('Не удалось загрузить список файлов.');
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3500);
  };

  const showError = (msg) => {
    setError(msg);
    setTimeout(() => setError(''), 4000);
  };

  const validateFile = (file) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      showError(`Файл "${file.name}" имеет неверный формат. Допустимо: PNG, JPG, JPEG.`);
      return false;
    }
    if (file.size > MAX_SIZE_BYTES) {
      showError(`Файл "${file.name}" превышает ${MAX_SIZE_MB} МБ.`);
      return false;
    }
    return true;
  };

  const uploadFile = async (file) => {
    if (!validateFile(file)) return;

    setUploading(true);
    setUploadProgress(0);
    setError('');

    // Animate progress
    const interval = setInterval(() => {
      setUploadProgress((p) => (p < 85 ? p + Math.random() * 12 : p));
    }, 200);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${apiUrl}/api/admin/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      clearInterval(interval);
      setUploadProgress(100);

      if (res.ok) {
        const data = await res.json();
        showSuccess(`Загружено: ${data.fileName} (${formatSize(data.sizeKb)})`);
        await fetchFiles();
      } else {
        const data = await res.json().catch(() => ({}));
        showError(data.message || 'Ошибка загрузки файла.');
      }
    } catch {
      clearInterval(interval);
      showError('Ошибка соединения с сервером.');
    } finally {
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 600);
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
      showError('Не удалось скопировать ссылку.');
    }
  };

  const handleDelete = async (fileName) => {
    setDeletingFile(fileName);
    try {
      const res = await fetch(`${apiUrl}/api/admin/files/${encodeURIComponent(fileName)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        showSuccess(`Файл "${fileName}" удалён.`);
        setFiles((prev) => prev.filter((f) => f.fileName !== fileName));
      } else {
        showError('Не удалось удалить файл.');
      }
    } catch {
      showError('Ошибка соединения с сервером.');
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
          transition={{ duration: 0.4 }}
        >
          <div>
            <h1 className="database__title">Database</h1>
            <p className="database__subtitle">Управление изображениями в Supabase Storage</p>
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

        {/* Notifications */}
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

        {/* Drop zone */}
        <motion.div
          id="database-dropzone"
          className={`database__dropzone${dragOver ? ' database__dropzone--over' : ''}${uploading ? ' database__dropzone--uploading' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && inputRef.current?.click()}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
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
              <p className="database__progress-label">Сжатие и загрузка...</p>
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
                {dragOver ? 'Отпустите файл' : 'Перетащите изображение или нажмите'}
              </p>
              <p className="database__dropzone-hint">PNG, JPG, JPEG · максимум {MAX_SIZE_MB} МБ</p>
              <div className="database__dropzone-badges">
                <span className="database__badge">PNG</span>
                <span className="database__badge">JPG</span>
                <span className="database__badge">JPEG</span>
                <span className="database__badge database__badge--arrow">→ WebP</span>
              </div>
            </div>
          )}
        </motion.div>

        {/* Files grid */}
        <div className="database__files-header">
          <h2 className="database__files-title">
            Загруженные файлы
            {!loading && (
              <span className="database__files-count">{files.length}</span>
            )}
          </h2>
          <button
            id="database-refresh-btn"
            className="database__refresh-btn"
            onClick={fetchFiles}
            title="Обновить список"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="database__loading">
            <div className="admin-spinner" />
          </div>
        ) : files.length === 0 ? (
          <motion.div
            className="database__empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <p>Нет загруженных файлов</p>
          </motion.div>
        ) : (
          <motion.div
            className="database__grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <AnimatePresence>
              {files.map((file, i) => (
                <motion.div
                  key={file.fileName}
                  className="database__file-card"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.04, duration: 0.3 }}
                  layout
                >
                  <div className="database__file-img">
                    <img
                      src={file.publicUrl}
                      alt={file.fileName}
                      loading="lazy"
                    />
                  </div>
                  <div className="database__file-info">
                    <p className="database__file-name" title={file.fileName}>
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
                        title="Скопировать URL"
                      >
                        {copiedUrl === file.fileName ? (
                          <>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            Скопировано
                          </>
                        ) : (
                          <>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                            URL
                          </>
                        )}
                      </button>
                      <button
                        id={`database-delete-${i}`}
                        className="database__file-btn database__file-btn--delete"
                        onClick={() => handleDelete(file.fileName)}
                        disabled={deletingFile === file.fileName}
                        title="Удалить файл"
                      >
                        {deletingFile === file.fileName ? (
                          <span className="admin-spinner" style={{ width: 14, height: 14 }} />
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6M14 11v6" />
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Database;

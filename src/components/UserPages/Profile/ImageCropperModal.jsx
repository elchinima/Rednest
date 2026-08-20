import React, { useState, useRef, useEffect, useCallback } from 'react';
import AnimatedModalWrapper from '../../Elements/AnimatedModalWrapper';
import loaderIcon from '../../../assets/icons/loader-animated.svg';

const CROP_BOX_SIZE = 260;

const ImageCropperModal = ({ isOpen, imageSrc, fileName, onClose, onCrop, loading }) => {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [naturalDimensions, setNaturalDimensions] = useState({ width: 0, height: 0 });

  const imageRef = useRef(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const startOffsetRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (isOpen && imageSrc) {
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setImageLoaded(false);
      const img = new Image();
      img.onload = () => {
        setNaturalDimensions({ width: img.naturalWidth, height: img.naturalHeight });
        setImageLoaded(true);
      };
      img.src = imageSrc;
    }
  }, [isOpen, imageSrc]);

  const baseScale = naturalDimensions.width && naturalDimensions.height
    ? Math.max(CROP_BOX_SIZE / naturalDimensions.width, CROP_BOX_SIZE / naturalDimensions.height)
    : 1;

  const currentScale = baseScale * zoom;
  const currentWidth = naturalDimensions.width * currentScale;
  const currentHeight = naturalDimensions.height * currentScale;

  const maxOffsetX = Math.max(0, (currentWidth - CROP_BOX_SIZE) / 2);
  const maxOffsetY = Math.max(0, (currentHeight - CROP_BOX_SIZE) / 2);

  const clampOffset = useCallback((x, y, scaleVal) => {
    const s = baseScale * scaleVal;
    const w = naturalDimensions.width * s;
    const h = naturalDimensions.height * s;
    const maxX = Math.max(0, (w - CROP_BOX_SIZE) / 2);
    const maxY = Math.max(0, (h - CROP_BOX_SIZE) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  }, [baseScale, naturalDimensions]);

  const handleZoomChange = (newZoom) => {
    const nextZoom = Math.max(1, Math.min(3, newZoom));
    setZoom(nextZoom);
    setOffset((prev) => clampOffset(prev.x, prev.y, nextZoom));
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    startOffsetRef.current = { ...offset };
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const rawX = startOffsetRef.current.x + dx;
    const rawY = startOffsetRef.current.y + dy;
    setOffset(clampOffset(rawX, rawY, zoom));
  }, [clampOffset, zoom]);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      isDraggingRef.current = true;
      dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      startOffsetRef.current = { ...offset };
    }
  };

  const handleTouchMove = (e) => {
    if (!isDraggingRef.current || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragStartRef.current.x;
    const dy = e.touches[0].clientY - dragStartRef.current.y;
    const rawX = startOffsetRef.current.x + dx;
    const rawY = startOffsetRef.current.y + dy;
    setOffset(clampOffset(rawX, rawY, zoom));
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
  };

  const handleApplyCrop = () => {
    if (!imageRef.current || !imageLoaded) return;

    const img = imageRef.current;
    const scale = baseScale * zoom;
    const cropInImgSpace = CROP_BOX_SIZE / scale;

    const centerImgX = naturalDimensions.width / 2 - offset.x / scale;
    const centerImgY = naturalDimensions.height / 2 - offset.y / scale;

    const srcX = centerImgX - cropInImgSpace / 2;
    const srcY = centerImgY - cropInImgSpace / 2;
    const srcSize = cropInImgSpace;

    const outputSize = Math.min(Math.max(naturalDimensions.width, naturalDimensions.height), 800);

    const canvas = document.createElement('canvas');
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      img,
      Math.max(0, srcX),
      Math.max(0, srcY),
      srcSize,
      srcSize,
      0,
      0,
      outputSize,
      outputSize
    );

    canvas.toBlob((blob) => {
      if (!blob) return;
      const croppedFile = new File([blob], fileName || 'profile-avatar.jpg', {
        type: 'image/jpeg',
      });
      onCrop(croppedFile);
    }, 'image/jpeg', 0.95);
  };

  return (
    <AnimatedModalWrapper isOpen={isOpen} onClose={() => !loading && onClose()} targetBorderRadius="24px">
      <div className="profile-cropper-modal">
        <h3 className="profile-cropper-modal__title">Crop & Position Photo</h3>
        <p className="profile-cropper-modal__subtitle">
          Drag to move and use slider to zoom into square
        </p>

        <div
          className="profile-cropper-viewport"
          style={{ width: `${CROP_BOX_SIZE}px`, height: `${CROP_BOX_SIZE}px` }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {imageSrc && (
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Crop preview"
              className="profile-cropper-img"
              style={{
                width: `${currentWidth}px`,
                height: `${currentHeight}px`,
                transform: `translate(${offset.x}px, ${offset.y}px)`,
              }}
              draggable={false}
            />
          )}

          <div className="profile-cropper-overlay" />
          <div className="profile-cropper-circle-guide" />
        </div>

        <div className="profile-cropper-controls">
          <button
            type="button"
            className="profile-cropper-zoom-btn"
            onClick={() => handleZoomChange(zoom - 0.2)}
            disabled={zoom <= 1 || loading}
            aria-label="Zoom out"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>

          <input
            type="range"
            min="1"
            max="3"
            step="0.01"
            value={zoom}
            onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
            className="profile-cropper-slider"
            disabled={loading}
          />

          <button
            type="button"
            className="profile-cropper-zoom-btn"
            onClick={() => handleZoomChange(zoom + 0.2)}
            disabled={zoom >= 3 || loading}
            aria-label="Zoom in"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>

        <div className="profile-cropper-modal__actions">
          <button
            type="button"
            className="cta-btn sm profile-modal__btn profile-modal__btn--cancel"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="cta-btn sm profile-modal__btn profile-modal__btn--confirm-delete"
            onClick={handleApplyCrop}
            disabled={loading || !imageLoaded}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 48 48"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  style={{ flexShrink: 0 }}
                >
                  <g>
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      values="0 24 24; 360 24 24"
                      dur="1s"
                      repeatCount="indefinite"
                    />
                    <circle
                      cx="24"
                      cy="24"
                      r="19.2"
                      stroke="#ef4444"
                      strokeOpacity="0.25"
                      strokeWidth="4.5"
                    />
                    <path
                      d="M24 4.8 A19.2 19.2 0 0 1 43.2 24"
                      stroke="#ef4444"
                      strokeWidth="4.5"
                      strokeLinecap="round"
                    />
                  </g>
                </svg>
                Saving...
              </span>
            ) : (
              'Apply'
            )}
          </button>
        </div>
      </div>
    </AnimatedModalWrapper>
  );
};

export default ImageCropperModal;

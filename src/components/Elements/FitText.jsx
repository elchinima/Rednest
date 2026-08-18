import React, { useRef, useState, useLayoutEffect, useEffect } from 'react';

const FitText = ({
  children,
  as: Component = 'span',
  maxFontSize = 1.2,
  minFontSize = 0.7,
  unit = 'rem',
  className = '',
  style = {},
  ...props
}) => {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [currentFontSize, setCurrentFontSize] = useState(maxFontSize);

  const calculateSize = () => {
    const container = containerRef.current;
    const text = textRef.current;
    if (!container || !text) return;

    const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const maxPx = unit === 'rem' ? maxFontSize * rootFontSize : maxFontSize;
    const minPx = unit === 'rem' ? minFontSize * rootFontSize : minFontSize;

    const availableWidth = container.clientWidth;
    if (availableWidth <= 0) return;

    text.style.fontSize = `${maxPx}px`;
    text.style.display = 'inline-block';
    text.style.whiteSpace = 'nowrap';

    const naturalWidth = text.scrollWidth;

    if (naturalWidth <= availableWidth) {
      setCurrentFontSize(maxFontSize);
      text.style.fontSize = `${maxPx}px`;
    } else {
      const ratio = availableWidth / naturalWidth;
      const calculatedPx = maxPx * ratio;
      const clampedPx = Math.max(minPx, Math.min(maxPx, Math.floor(calculatedPx * 0.98)));
      const finalValue = unit === 'rem' ? clampedPx / rootFontSize : clampedPx;
      setCurrentFontSize(finalValue);
      text.style.fontSize = `${clampedPx}px`;
    }
  };

  useLayoutEffect(() => {
    calculateSize();
  }, [children, maxFontSize, minFontSize, unit]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      calculateSize();
    });
    resizeObserver.observe(container);

    if (document.fonts) {
      document.fonts.ready.then(calculateSize).catch(() => {});
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [children, maxFontSize, minFontSize, unit]);

  return (
    <Component
      ref={containerRef}
      className={`fit-text-container ${className}`}
      style={{
        display: 'block',
        width: '100%',
        minWidth: 0,
        overflow: 'hidden',
        ...style,
      }}
      {...props}
    >
      <span
        ref={textRef}
        style={{
          display: 'block',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          fontSize: `${currentFontSize}${unit}`,
          lineHeight: '1.25',
          transition: 'font-size 0.1s ease-out',
        }}
      >
        {children}
      </span>
    </Component>
  );
};

export default FitText;

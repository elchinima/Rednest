import React, { useRef, useState, useLayoutEffect, useEffect, useCallback } from 'react';

const FitDescription = ({
  children,
  as: Component = 'div',
  className = '',
  maxFontSize = 0.82,
  minFontSize = 0.65,
  unit = 'rem',
  threshold = 0.3,
  style = {},
  ...props
}) => {
  const containerRef = useRef(null);
  const lastWidthRef = useRef(0);
  const [styleState, setStyleState] = useState({
    fontSize: `${maxFontSize}${unit}`,
    whiteSpace: 'normal',
  });

  const calculate = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const availableWidth = container.clientWidth;
    if (availableWidth <= 0) return;

    if (Math.abs(availableWidth - lastWidthRef.current) < 0.5) return;
    lastWidthRef.current = availableWidth;

    const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const maxPx = unit === 'rem' ? maxFontSize * rootFontSize : maxFontSize;
    const minPx = unit === 'rem' ? minFontSize * rootFontSize : minFontSize;
    const textString = typeof children === 'string' ? children : container.innerText;

    const computed = getComputedStyle(container);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.font = `${computed.fontWeight} ${maxPx}px ${computed.fontFamily}`;

    const singleLineWidth = ctx.measureText(textString).width;

    if (singleLineWidth <= availableWidth) {
      setStyleState((prev) => {
        const nextFs = `${maxFontSize}${unit}`;
        if (prev.fontSize === nextFs && prev.whiteSpace === 'normal') return prev;
        return { fontSize: nextFs, whiteSpace: 'normal' };
      });
      return;
    }

    const words = textString.trim().split(/\s+/);
    let line1 = '';
    let line2 = '';
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      const testLine = currentLine ? `${currentLine} ${words[i]}` : words[i];
      const testWidth = ctx.measureText(testLine).width;
      if (testWidth > availableWidth && currentLine !== '') {
        if (!line1) {
          line1 = currentLine;
          currentLine = words[i];
        } else {
          currentLine = testLine;
        }
      } else {
        currentLine = testLine;
      }
    }
    line2 = currentLine;

    const secondLineWidth = ctx.measureText(line2).width;
    const secondLineRatio = secondLineWidth / availableWidth;

    if (secondLineRatio >= threshold) {
      setStyleState((prev) => {
        const nextFs = `${maxFontSize}${unit}`;
        if (prev.fontSize === nextFs && prev.whiteSpace === 'normal') return prev;
        return { fontSize: nextFs, whiteSpace: 'normal' };
      });
    } else {
      const targetPx = Math.max(minPx, (availableWidth / singleLineWidth) * maxPx * 0.98);
      const finalValue = unit === 'rem' ? targetPx / rootFontSize : targetPx;
      setStyleState((prev) => {
        const nextFs = `${finalValue}${unit}`;
        if (prev.fontSize === nextFs && prev.whiteSpace === 'nowrap') return prev;
        return { fontSize: nextFs, whiteSpace: 'nowrap' };
      });
    }
  }, [children, maxFontSize, minFontSize, unit, threshold]);

  useLayoutEffect(() => {
    lastWidthRef.current = 0;
    calculate();
  }, [calculate]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && Math.abs(entry.contentRect.width - lastWidthRef.current) >= 0.5) {
          calculate();
        }
      }
    });

    resizeObserver.observe(container);

    if (document.fonts) {
      document.fonts.ready.then(() => {
        lastWidthRef.current = 0;
        calculate();
      }).catch(() => {});
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [calculate]);

  return (
    <Component
      ref={containerRef}
      className={className}
      style={{
        fontSize: styleState.fontSize,
        whiteSpace: styleState.whiteSpace,
        width: '100%',
        minWidth: 0,
        lineHeight: 1.4,
        ...style,
      }}
      {...props}
    >
      {children}
    </Component>
  );
};

export default FitDescription;

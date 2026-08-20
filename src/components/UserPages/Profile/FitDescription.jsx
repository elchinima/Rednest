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
  const [styleState, setStyleState] = useState({
    fontSize: `${maxFontSize}${unit}`,
    whiteSpace: 'normal',
  });

  const calculate = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const availableWidth = container.clientWidth;
    if (availableWidth <= 0) return;

    const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const maxPx = unit === 'rem' ? maxFontSize * rootFontSize : maxFontSize;
    const minPx = unit === 'rem' ? minFontSize * rootFontSize : minFontSize;
    const textString = typeof children === 'string' ? children : container.innerText;

    const measurer = document.createElement('div');
    measurer.style.visibility = 'hidden';
    measurer.style.position = 'absolute';
    measurer.style.top = '-9999px';
    measurer.style.left = '-9999px';
    measurer.style.width = `${availableWidth}px`;
    measurer.style.whiteSpace = 'normal';
    measurer.style.fontSize = `${maxPx}px`;
    measurer.style.fontFamily = getComputedStyle(container).fontFamily;
    measurer.style.fontWeight = getComputedStyle(container).fontWeight;
    measurer.style.letterSpacing = getComputedStyle(container).letterSpacing;
    measurer.style.lineHeight = getComputedStyle(container).lineHeight;

    const textNode = document.createTextNode(textString);
    measurer.appendChild(textNode);
    document.body.appendChild(measurer);

    const range = document.createRange();
    range.selectNodeContents(textNode);
    const rects = range.getClientRects();

    const isWrapped = rects.length > 1;
    const secondLineWidth = isWrapped ? rects[rects.length - 1].width : 0;
    const secondLineRatio = secondLineWidth / availableWidth;

    measurer.style.width = 'auto';
    measurer.style.whiteSpace = 'nowrap';
    const singleLineWidth = measurer.getBoundingClientRect().width;

    document.body.removeChild(measurer);

    if (!isWrapped || singleLineWidth <= availableWidth) {
      setStyleState({
        fontSize: `${maxFontSize}${unit}`,
        whiteSpace: 'normal',
      });
    } else {
      if (secondLineRatio >= threshold) {
        setStyleState({
          fontSize: `${maxFontSize}${unit}`,
          whiteSpace: 'normal',
        });
      } else {
        const targetPx = Math.max(minPx, (availableWidth / singleLineWidth) * maxPx * 0.98);
        const finalValue = unit === 'rem' ? targetPx / rootFontSize : targetPx;
        setStyleState({
          fontSize: `${finalValue}${unit}`,
          whiteSpace: 'nowrap',
        });
      }
    }
  }, [children, maxFontSize, minFontSize, unit, threshold]);

  useLayoutEffect(() => {
    calculate();
  }, [calculate]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      calculate();
    });
    resizeObserver.observe(container);

    if (document.fonts) {
      document.fonts.ready.then(calculate).catch(() => {});
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
        transition: 'font-size 0.15s ease-out',
        ...style,
      }}
      {...props}
    >
      {children}
    </Component>
  );
};

export default FitDescription;

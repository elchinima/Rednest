import { useState, useEffect, useRef } from 'react';

export function useSequentialImageLoader(items = []) {
  const [loadedMap, setLoadedMap] = useState({});
  const queueRef = useRef([]);
  const isProcessingRef = useRef(false);
  const loadedSetRef = useRef(new Set());
  const activeImgRef = useRef(null);

  useEffect(() => {
    if (!items || items.length === 0) return;

    const pending = items.filter(
      item => item && item.id && item.imageUrl && !loadedSetRef.current.has(item.id)
    );

    queueRef.current = pending;

    function processNext() {
      if (queueRef.current.length === 0) {
        isProcessingRef.current = false;
        activeImgRef.current = null;
        return;
      }

      const nextItem = queueRef.current.shift();
      if (!nextItem || !nextItem.imageUrl) {
        processNext();
        return;
      }

      if (loadedSetRef.current.has(nextItem.id)) {
        processNext();
        return;
      }

      const img = new Image();
      activeImgRef.current = img;
      let completed = false;

      const onComplete = () => {
        if (completed) return;
        completed = true;
        loadedSetRef.current.add(nextItem.id);
        setLoadedMap(prev => ({ ...prev, [nextItem.id]: true }));
        processNext();
      };

      img.onload = onComplete;
      img.onerror = onComplete;
      img.src = nextItem.imageUrl;

      if (img.complete) {
        onComplete();
      }
    }

    if (!isProcessingRef.current && pending.length > 0) {
      isProcessingRef.current = true;
      processNext();
    }

    return () => {
      if (activeImgRef.current) {
        activeImgRef.current.onload = null;
        activeImgRef.current.onerror = null;
      }
    };
  }, [items]);

  return loadedMap;
}

export default useSequentialImageLoader;

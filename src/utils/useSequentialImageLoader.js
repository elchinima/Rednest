import { useState, useEffect, useRef, useCallback } from 'react';

const globalLoadedSet = new Set();

export function useSequentialImageLoader(items = []) {
  const [loadedMap, setLoadedMap] = useState(() => {
    const initial = {};
    if (Array.isArray(items)) {
      items.forEach(item => {
        if (item && item.id && globalLoadedSet.has(item.id)) {
          initial[item.id] = true;
        }
      });
    }
    return initial;
  });

  const activeImgRef = useRef(null);
  const isRunningRef = useRef(false);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const markLoaded = useCallback((id) => {
    if (!id) return;
    globalLoadedSet.add(id);
    setLoadedMap(prev => {
      if (prev[id]) return prev;
      return { ...prev, [id]: true };
    });
  }, []);

  useEffect(() => {
    if (!items || items.length === 0) return;

    items.forEach(item => {
      if (item && item.id && globalLoadedSet.has(item.id)) {
        markLoaded(item.id);
      }
    });

    let isMounted = true;

    function processQueue() {
      if (!isMounted) {
        isRunningRef.current = false;
        return;
      }

      const currentList = itemsRef.current || [];
      const nextItem = currentList.find(
        item => item && item.id && (item.images?.image || item.imageUrl) && !globalLoadedSet.has(item.id)
      );

      if (!nextItem) {
        isRunningRef.current = false;
        activeImgRef.current = null;
        return;
      }

      const itemImgSrc = nextItem.images?.image || nextItem.imageUrl;

      isRunningRef.current = true;
      const img = new Image();
      activeImgRef.current = img;

      let resolved = false;
      const done = () => {
        if (resolved) return;
        resolved = true;
        globalLoadedSet.add(nextItem.id);
        if (isMounted) {
          setLoadedMap(prev => ({ ...prev, [nextItem.id]: true }));
          setTimeout(() => {
            if (isMounted) {
              processQueue();
            }
          }, 20);
        } else {
          isRunningRef.current = false;
        }
      };

      img.onload = done;
      img.onerror = done;
      img.src = itemImgSrc;

      if (img.complete) {
        done();
      }
    }

    if (!isRunningRef.current) {
      processQueue();
    }

    return () => {
      isMounted = false;
      isRunningRef.current = false;
      if (activeImgRef.current) {
        activeImgRef.current.onload = null;
        activeImgRef.current.onerror = null;
      }
    };
  }, [items, markLoaded]);

  loadedMap.markLoaded = markLoaded;

  return loadedMap;
}

export default useSequentialImageLoader;


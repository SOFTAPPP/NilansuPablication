import { useState, useCallback, useRef } from 'react';

interface UseIntersectionOptions {
  root?: Element | null;
  rootMargin?: string;
  threshold?: number | number[];
}

export function useIntersection(options: UseIntersectionOptions = {}) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  
  const observerRef = useRef<IntersectionObserver | null>(null);

  const setRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    if (node) {
      observerRef.current = new IntersectionObserver(([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      }, {
        root: options.root || null,
        rootMargin: options.rootMargin || '0px 0px 600px 0px',
        threshold: options.threshold || 0
      });
      observerRef.current.observe(node);
    }
  }, [options.root, options.rootMargin, options.threshold]);

  return { isIntersecting, setRef };
}

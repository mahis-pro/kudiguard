import React, { useEffect, useRef, useState } from 'react';

interface UseAnimateOnScrollOptions {
  threshold?: number; // Percentage of element visibility to trigger
  rootMargin?: string; // Margin around the root (viewport)
  delay?: number; // Delay in milliseconds for the animation
}

export const useAnimateOnScroll = ({
  threshold = 0.1,
  rootMargin = '0px',
  delay = 0,
}: UseAnimateOnScrollOptions = {}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Add a small delay before setting isVisible to true for staggering
          setTimeout(() => {
            setIsVisible(true);
          }, delay);
          // Stop observing once visible to prevent re-triggering
          if (ref.current) {
            observer.unobserve(ref.current);
          }
        }
      },
      { threshold, rootMargin }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [threshold, rootMargin, delay]);

  return { ref, isVisible };
};
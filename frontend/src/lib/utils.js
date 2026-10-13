import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { useState, useEffect, useRef, useCallback } from "react"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * Hook to track request cancellation with AbortController
 * Use this to prevent race conditions in fetch operations
 * @returns {Object} - { abortControllerRef, isCancelledRef }
 */
export function useAbortController() {
  const abortControllerRef = useRef(null);
  const isCancelledRef = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isCancelledRef.current = true;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  /**
   * Create a fetch function that can be aborted
   * @param {Function} fetchFn - The async fetch function
   * @returns {Promise} - Resolves with data or rejects with error
   */
  const fetchWithAbort = useCallback(async (fetchFn) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    isCancelledRef.current = false;

    try {
      // Note: Our api wrapper doesn't support signal directly,
      // but we can still use the pattern for cleanup
      const result = await fetchFn();
      
      if (isCancelledRef.current) {
        throw new Error('Request cancelled');
      }
      
      return result;
    } catch (err) {
      if (err.name === 'AbortError' || isCancelledRef.current) {
        // Silently ignore cancelled requests
        return null;
      }
      throw err;
    }
  }, []);

  return { abortControllerRef, isCancelledRef, fetchWithAbort };
}

/**
 * Simple ref-based approach to prevent state updates on unmounted components
 * and handle race conditions
 * @returns {Object} - { isMountedRef, runIfMounted }
 */
export function useMountedRef() {
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /**
   * Run a callback only if component is still mounted
   * @param {Function} callback - Function to execute
   */
  const runIfMounted = useCallback((callback) => {
    if (isMountedRef.current) {
      return callback();
    }
    return null;
  }, []);

  return { isMountedRef, runIfMounted };
}

/**
 * Custom hook to detect media query matches
 * @param {string} query - Media query string
 * @returns {boolean} - Whether the query matches
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const mediaQueryList = window.matchMedia(query);
    const updateMatches = () => setMatches(mediaQueryList.matches);
    
    // Set initial value
    updateMatches();
    
    // Listen for changes
    mediaQueryList.addEventListener('change', updateMatches);
    
    return () => {
      mediaQueryList.removeEventListener('change', updateMatches);
    };
  }, [query]);

  return matches;
}

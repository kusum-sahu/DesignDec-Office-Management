import { useSyncExternalStore } from "react";

/**
 * Hook to listen to CSS media query matching using modern useSyncExternalStore
 * @param {string} query e.g. '(min-width: 1024px)'
 * @returns {boolean}
 */
export function useMediaQuery(query) {
  const subscribe = (callback) => {
    if (typeof window === "undefined") return () => {};
    const media = window.matchMedia(query);
    media.addEventListener("change", callback);
    return () => media.removeEventListener("change", callback);
  };

  const getSnapshot = () => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  };

  const getServerSnapshot = () => false;

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useIsMobile() {
  return useMediaQuery("(max-width: 767px)");
}

export function useIsTablet() {
  return useMediaQuery("(min-width: 768px) and (max-width: 1023px)");
}

export function useIsDesktop() {
  return useMediaQuery("(min-width: 1024px)");
}

export default useMediaQuery;

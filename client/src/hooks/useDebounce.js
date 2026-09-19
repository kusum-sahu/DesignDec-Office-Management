import { useState, useEffect } from "react";

/**
 * Hook to debounce any fast changing value (e.g. search input)
 * @param {any} value
 * @param {number} delay in milliseconds
 * @returns {any}
 */
export function useDebounce(value, delay = 400) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;

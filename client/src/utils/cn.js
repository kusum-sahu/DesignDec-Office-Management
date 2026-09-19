import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge class names using clsx and tailwind-merge
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default cn;

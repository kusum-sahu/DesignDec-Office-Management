import { format, formatDistanceToNow, isValid, parseISO } from "date-fns";

/**
 * Format number as Indian Rupee currency (INR)
 * @param {number|string} amount
 * @returns {string} e.g. "₹1,250.00"
 */
export function formatCurrency(amount) {
  const num = Number(amount);
  if (!Number.isFinite(num)) return "₹0.00";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Safely parse date from string or Date
 * @param {Date|string|number} dateVal
 * @returns {Date|null}
 */
export function safeDate(dateVal) {
  if (!dateVal) return null;
  const d = typeof dateVal === "string" ? parseISO(dateVal) : new Date(dateVal);
  return isValid(d) ? d : null;
}

/**
 * Format date nicely
 * @param {Date|string|number} dateVal
 * @param {string} formatStr default 'dd MMM yyyy'
 * @returns {string}
 */
export function formatDate(dateVal, formatStr = "dd MMM yyyy") {
  const d = safeDate(dateVal);
  if (!d) return "—";
  try {
    return format(d, formatStr);
  } catch {
    return "—";
  }
}

/**
 * Format date & time nicely
 * @param {Date|string|number} dateVal
 * @returns {string} e.g. "12 Jul 2026, 09:30 AM"
 */
export function formatDateTime(dateVal) {
  return formatDate(dateVal, "dd MMM yyyy, hh:mm a");
}

/**
 * Format relative time (e.g. "2 hours ago")
 * @param {Date|string|number} dateVal
 * @returns {string}
 */
export function formatRelativeTime(dateVal) {
  const d = safeDate(dateVal);
  if (!d) return "—";
  try {
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return "—";
  }
}

/**
 * Format phone number
 * @param {string} phone
 * @returns {string}
 */
export function formatPhone(phone) {
  if (!phone) return "—";
  const cleaned = String(phone).replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  return phone;
}

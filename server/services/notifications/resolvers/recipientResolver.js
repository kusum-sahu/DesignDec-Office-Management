import User from "../../../models/User.js";

/**
 * Normalizes phone numbers to standard format (E.164 / +91 default)
 * @param {string} phone
 * @param {string} defaultCountryCode
 * @returns {string|null}
 */
export function normalizePhoneNumber(
  phone,
  defaultCountryCode = process.env.DEFAULT_COUNTRY_CODE || "+91"
) {
  if (!phone || typeof phone !== "string") return null;

  // Remove whitespace, dashes, parentheses, dots
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, "").trim();
  if (!cleaned) return null;

  // Already E.164 (e.g. +917847867110 or +14155552671)
  if (cleaned.startsWith("+")) {
    // Basic E.164 length check (8 to 15 digits)
    return /^\+\d{8,15}$/.test(cleaned) ? cleaned : null;
  }

  // 10-digit Indian phone starting with 6, 7, 8, or 9
  if (/^[6-9]\d{9}$/.test(cleaned)) {
    const code = defaultCountryCode.startsWith("+")
      ? defaultCountryCode
      : `+${defaultCountryCode}`;
    return `${code}${cleaned}`;
  }

  // 12-digit number starting with 91 (e.g. 917847867110)
  if (/^91[6-9]\d{9}$/.test(cleaned)) {
    return `+${cleaned}`;
  }

  // Generic digits check
  if (/^\d{8,15}$/.test(cleaned)) {
    const code = defaultCountryCode.startsWith("+")
      ? defaultCountryCode
      : `+${defaultCountryCode}`;
    return `${code}${cleaned}`;
  }

  return null;
}

/**
 * Resolves active Admin and Branch Manager recipients from DB based on branch context
 * @param {Object} params
 * @param {string} [params.branch] - Target branch (e.g. "Santoshpur Branch" or "Main Office")
 * @param {string} [params.event] - Event type
 * @returns {Promise<Array<{ user: Object, userId: string, name: string, email: string, role: string, branch: string, phone: string|null, hasValidPhone: boolean }>>}
 */
export async function resolveBranchRecipients({ branch, event }) {
  const recipientMap = new Map();

  // 1. All Active Admins (Main Office leadership always receives critical alerts)
  const activeAdmins = await User.find({
    role: "Admin",
    status: "Active",
  })
    .select("_id name email phone role branch designation")
    .lean();

  for (const admin of activeAdmins) {
    recipientMap.set(String(admin._id), admin);
  }

  // 2. Active Branch Managers for the specific branch (if specified)
  if (branch && branch !== "Main Office") {
    // Match explicit role "Branch Manager" OR designation regex matching "Branch Manager"
    const branchManagers = await User.find({
      status: "Active",
      branch: branch,
      $or: [
        { role: "Branch Manager" },
        { designation: /^\s*branch\s*man?ager\s*$/i },
      ],
    })
      .select("_id name email phone role branch designation")
      .lean();

    for (const bm of branchManagers) {
      recipientMap.set(String(bm._id), bm);
    }
  }

  // Map each unique recipient with normalized phone validation
  const resolved = [];
  for (const [userId, user] of recipientMap.entries()) {
    const normalizedPhone = normalizePhoneNumber(user.phone);
    resolved.push({
      user,
      userId,
      name: user.name || "Staff Member",
      email: user.email || "",
      role: user.role || "Employee",
      branch: user.branch || "Main Office",
      phone: normalizedPhone,
      hasValidPhone: Boolean(normalizedPhone),
    });
  }

  return resolved;
}

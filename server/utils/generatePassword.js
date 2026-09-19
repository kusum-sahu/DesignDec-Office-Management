import crypto from "crypto";

/**
 * Generate a cryptographically secure temporary password for employee onboarding.
 * - Minimum 10 characters (exceeds 8-character requirements).
 * - Guaranteed complexity: contains uppercase, lowercase, numbers, and special symbols.
 * - Omits ambiguous characters (0, O, 1, l, I) to prevent onboarding friction.
 * - Uses crypto.randomInt for true cryptographic randomness.
 */
const generatePassword = (length = 10) => {
  const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // omitted I, O
  const lowercase = "abcdefghjkmnpqrstuvwxyz"; // omitted l
  const numbers = "23456789";                  // omitted 0, 1
  const symbols = "@#$&*!";

  const all = uppercase + lowercase + numbers + symbols;

  // Guarantee at least one character from each mandatory character set
  const passwordChars = [
    uppercase[crypto.randomInt(0, uppercase.length)],
    lowercase[crypto.randomInt(0, lowercase.length)],
    numbers[crypto.randomInt(0, numbers.length)],
    symbols[crypto.randomInt(0, symbols.length)],
  ];

  // Fill the remaining length with random selections from the entire character pool
  for (let i = passwordChars.length; i < length; i++) {
    passwordChars.push(all[crypto.randomInt(0, all.length)]);
  }

  // Cryptographically shuffle array using Fisher-Yates algorithm
  for (let i = passwordChars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [passwordChars[i], passwordChars[j]] = [passwordChars[j], passwordChars[i]];
  }

  return passwordChars.join("");
};

export default generatePassword;
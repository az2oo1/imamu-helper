import crypto from 'crypto';

/**
 * Normalizes an email address (trims and lowercases) and computes its SHA-256 hash in hex format.
 * Raw emails should only exist in-memory during sign-up/login/sending codes and never saved in DB/storage.
 */
export function hashEmail(email: string): string {
  if (!email) return '';
  const normalized = email.trim().toLowerCase();
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

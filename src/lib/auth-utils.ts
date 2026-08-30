/**
 * Normalizes user email or username identifiers by trimming whitespace,
 * converting to lowercase, removing leading '@' characters, and stripping 's' prefix from student IDs.
 */
export function normalizeUserIdentifier(input?: string): string {
  if (!input) return '';
  let cleaned = input.trim().toLowerCase();
  cleaned = cleaned.replace(/^@/, '');
  return cleaned;
}

/**
 * Returns a student email format if input is a raw student ID number.
 */
export function formatStudentEmail(cleanedId: string): string {
  const cleanId = cleanedId.replace(/^s(?=\d{7,10})/i, '');
  if (!cleanId.includes('@')) {
    return `${cleanId}@sm.imamu.edu.sa`;
  }
  return cleanId;
}

/**
 * Sanitizes user record before returning in API payloads by removing passwordHash.
 */
export function sanitizeUser(user: any) {
  if (!user) return user;
  const { passwordHash, ...sanitized } = user;
  return sanitized;
}

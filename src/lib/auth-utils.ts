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

import { or, eq, sql } from 'drizzle-orm';

/**
 * Robust ID matcher that works for both standard JS integers (e.g. SQLite/PGlite unit tests)
 * and 64-bit BigInt IDs (e.g. CockroachDB production database) without floating-point precision loss.
 */
export function matchId(column: any, idRaw: string | number) {
  const strId = String(idRaw ?? '').trim();
  const numId = Number(strId);
  if (!isNaN(numId) && strId !== '') {
    return or(
      eq(column, numId),
      sql`CAST(${column} AS TEXT) = ${strId}`
    );
  }
  return sql`CAST(${column} AS TEXT) = ${strId}`;
}

export function matchSubjectIds(id1: any, id2: any): boolean {
  if (id1 == null || id2 == null || id1 === '' || id2 === '') return false;
  const s1 = String(id1).trim();
  const s2 = String(id2).trim();
  if (s1 === s2) return true;
  const n1 = Number(s1);
  const n2 = Number(s2);
  if (!isNaN(n1) && !isNaN(n2)) {
    return n1 === n2;
  }
  return false;
}

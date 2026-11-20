import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { z, ZodSchema } from 'zod';

const SALT_ROUNDS = 12;

/**
 * Hash a plaintext password using bcrypt with 12 salt rounds.
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

/**
 * Verify a plaintext password against a bcrypt hash.
 */
export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Generate a cryptographically random session token (UUID v4).
 */
export function generateSessionToken(): string {
  return uuidv4();
}

/**
 * Validate IPC input data against a Zod schema.
 * Returns the parsed data on success, throws a descriptive error on failure.
 */
export function validateIpcInput<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const messages = result.error.errors
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join('; ');
    throw new Error(`Validation failed: ${messages}`);
  }
  return result.data;
}

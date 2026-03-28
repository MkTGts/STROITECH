import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { FastifyInstance, FastifyRequest } from "fastify";

const SALT_ROUNDS = 12;

/** Без похожих символов 0/O, 1/l/I для одноразовых паролей. */
const TEMP_PASSWORD_ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Криптостойкий временный пароль (длина по умолчанию 14).
 */
export function generateTemporaryPassword(length = 14): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += TEMP_PASSWORD_ALPHABET[bytes[i]! % TEMP_PASSWORD_ALPHABET.length]!;
  }
  return out;
}

/**
 * Hash a plain-text password using bcrypt.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare a plain-text password against a bcrypt hash.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate access and refresh JWT tokens for the given user ID and role.
 */
export function generateTokens(
  app: FastifyInstance,
  payload: { userId: string; role: string }
): { accessToken: string; refreshToken: string } {
  const accessToken = app.jwt.sign(payload, { expiresIn: "15m" });
  const refreshToken = app.jwt.sign(payload, { expiresIn: "7d" });
  return { accessToken, refreshToken };
}

/**
 * Extract the authenticated user's ID from the JWT-decoded request.
 */
export function getUserId(request: FastifyRequest): string {
  return (request.user as { userId: string }).userId;
}

/**
 * Extract user ID when auth is optional (e.g. public list that shows extra data for owner).
 * Returns null if not authenticated.
 */
export function getOptionalUserId(request: FastifyRequest): string | null {
  const user = request.user as { userId?: string } | undefined;
  return user?.userId ?? null;
}

/** Роль из JWT при optional auth; иначе null. */
export function getOptionalUserRole(request: FastifyRequest): string | null {
  const user = request.user as { role?: string } | undefined;
  return user?.role ?? null;
}

/**
 * Extract the authenticated user's role from the JWT-decoded request.
 */
export function getUserRole(request: FastifyRequest): string {
  return (request.user as { role: string }).role;
}

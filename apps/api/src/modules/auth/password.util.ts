import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';

const ALGORITHM = 'sha512';
const ITERATIONS = 120000;
const KEY_LENGTH = 64;
const PREFIX = 'pbkdf2';

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, ALGORITHM).toString('hex');
  return `${PREFIX}$${ITERATIONS}$${salt}$${hash}`;
}

export function verifyPassword(password: string, passwordHash: string): boolean {
  const [prefix, iterationsRaw, salt, expectedHash] = passwordHash.split('$');
  if (!prefix || !iterationsRaw || !salt || !expectedHash || prefix !== PREFIX) {
    return false;
  }

  const iterations = Number(iterationsRaw);
  if (!Number.isFinite(iterations) || iterations <= 0) {
    return false;
  }

  const actual = pbkdf2Sync(password, salt, iterations, KEY_LENGTH, ALGORITHM);
  const expected = Buffer.from(expectedHash, 'hex');

  if (actual.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(actual, expected);
}

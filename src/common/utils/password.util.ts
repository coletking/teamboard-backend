import * as bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 10;

/** Hash a plaintext password for storage. */
export const hashPassword = (plain: string): Promise<string> =>
  bcrypt.hash(plain, BCRYPT_ROUNDS);

/** Constant-time comparison of a plaintext password against a stored hash. */
export const comparePassword = (plain: string, hash: string): Promise<boolean> =>
  bcrypt.compare(plain, hash);

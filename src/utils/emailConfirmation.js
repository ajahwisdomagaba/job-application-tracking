import { createHash, randomBytes } from 'node:crypto';

// The raw token is emailed once; only its SHA-256 hash is stored in MongoDB.
export const createEmailConfirmationToken = () => {
  const token = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  return { token, tokenHash };
};

export const hashEmailConfirmationToken = (token) =>
  createHash('sha256').update(String(token)).digest('hex');

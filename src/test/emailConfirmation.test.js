import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmailConfirmationToken, hashEmailConfirmationToken } from '../utils/emailConfirmation.js';

test('email confirmation token is random and stored as a one-way hash', () => {
  const first = createEmailConfirmationToken();
  const second = createEmailConfirmationToken();

  assert.equal(typeof first.token, 'string');
  assert.equal(first.token.length, 64);
  assert.match(first.token, /^[a-f0-9]{64}$/);
  assert.equal(first.tokenHash.length, 64);
  assert.notEqual(first.token, first.tokenHash);
  assert.notEqual(first.token, second.token);
  assert.equal(hashEmailConfirmationToken(first.token), first.tokenHash);
});

test('confirmation token hashes are deterministic for lookup', () => {
  const token = 'sample-token';
  assert.equal(hashEmailConfirmationToken(token), hashEmailConfirmationToken(token));
  assert.notEqual(hashEmailConfirmationToken(token), hashEmailConfirmationToken('different-token'));
});

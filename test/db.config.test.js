import assert from 'node:assert/strict';
import test from 'node:test';
import { getMongoUri } from '../src/config/db.js';

test('getMongoUri reads MONGODB_URI', () => {
  const originalMongoDbUri = process.env.MONGODB_URI;
  const originalMongoUri = process.env.MONGO_URI;
  process.env.MONGODB_URI = ' mongodb://localhost:27017/jobtracker ';
  delete process.env.MONGO_URI;

  try {
    assert.equal(getMongoUri(), 'mongodb://localhost:27017/jobtracker');
  } finally {
    if (originalMongoDbUri === undefined) delete process.env.MONGODB_URI;
    else process.env.MONGODB_URI = originalMongoDbUri;
    if (originalMongoUri === undefined) delete process.env.MONGO_URI;
    else process.env.MONGO_URI = originalMongoUri;
  }
});

test('getMongoUri supports the legacy MONGO_URI variable', () => {
  const originalMongoDbUri = process.env.MONGODB_URI;
  const originalMongoUri = process.env.MONGO_URI;
  delete process.env.MONGODB_URI;
  process.env.MONGO_URI = 'mongodb://localhost:27017/jobtracker';

  try {
    assert.equal(getMongoUri(), 'mongodb://localhost:27017/jobtracker');
  } finally {
    if (originalMongoDbUri === undefined) delete process.env.MONGODB_URI;
    else process.env.MONGODB_URI = originalMongoDbUri;
    if (originalMongoUri === undefined) delete process.env.MONGO_URI;
    else process.env.MONGO_URI = originalMongoUri;
  }
});

test('getMongoUri reports a clear error when no URI is configured', () => {
  const originalMongoDbUri = process.env.MONGODB_URI;
  const originalMongoUri = process.env.MONGO_URI;
  delete process.env.MONGODB_URI;
  delete process.env.MONGO_URI;

  try {
    assert.throws(getMongoUri, /MongoDB URI is missing/);
  } finally {
    if (originalMongoDbUri === undefined) delete process.env.MONGODB_URI;
    else process.env.MONGODB_URI = originalMongoDbUri;
    if (originalMongoUri === undefined) delete process.env.MONGO_URI;
    else process.env.MONGO_URI = originalMongoUri;
  }
});

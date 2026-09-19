import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { catalogCacheKey, stableKey } from './cacheKeys.js';

describe('stableKey', () => {
  it('is order-independent for objects', () => {
    assert.equal(stableKey({ b: 2, a: 1 }), stableKey({ a: 1, b: 2 }));
  });

  it('omits undefined values', () => {
    assert.equal(stableKey({ a: 1, b: undefined }), stableKey({ a: 1 }));
  });
});

describe('catalogCacheKey', () => {
  it('namespaces list keys', () => {
    const key = catalogCacheKey('list', { page: 1, limit: 20 });
    assert.match(key, /^catalog:products:list:/);
  });
});

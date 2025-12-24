const cacheService = require('../services/cacheService');

describe('CacheService', () => {
  beforeAll(async () => {
    // Connect to Redis
    await cacheService.connect();
  });

  afterAll(async () => {
    // Clean up and disconnect
    await cacheService.flush();
    await cacheService.disconnect();
  });

  afterEach(async () => {
    // Clear cache between tests
    await cacheService.flush();
  });

  describe('Basic Operations', () => {
    test('should set and get a value', async () => {
      const key = 'test:key';
      const value = { name: 'Test', count: 42 };

      await cacheService.set(key, value);
      const retrieved = await cacheService.get(key);

      expect(retrieved).toEqual(value);
    });

    test('should return null for non-existent key', async () => {
      const result = await cacheService.get('nonexistent:key');
      expect(result).toBeNull();
    });

    test('should delete a key', async () => {
      const key = 'test:delete';
      await cacheService.set(key, 'value');
      
      await cacheService.delete(key);
      const result = await cacheService.get(key);

      expect(result).toBeNull();
    });
  });

  describe('TTL', () => {
    test('should expire after TTL', async () => {
      const key = 'test:ttl';
      const value = 'expires soon';

      await cacheService.set(key, value, 1); // 1 second TTL
      
      // Should exist immediately
      let result = await cacheService.get(key);
      expect(result).toBe(value);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should be expired
      result = await cacheService.get(key);
      expect(result).toBeNull();
    });
  });

  describe('Pattern Operations', () => {
    test('should delete keys matching pattern', async () => {
      await cacheService.set('user:1', { id: 1 });
      await cacheService.set('user:2', { id: 2 });
      await cacheService.set('product:1', { id: 1 });

      const deletedCount = await cacheService.deletePattern('user:*');

      expect(deletedCount).toBe(2);
      expect(await cacheService.get('user:1')).toBeNull();
      expect(await cacheService.get('user:2')).toBeNull();
      expect(await cacheService.get('product:1')).not.toBeNull();
    });
  });

  describe('getOrSet Pattern', () => {
    test('should fetch and cache on miss', async () => {
      const key = 'test:getOrSet';
      let fetchCalled = false;

      const fetchFunction = async () => {
        fetchCalled = true;
        return { data: 'fetched' };
      };

      // First call should fetch
      const result1 = await cacheService.getOrSet(key, fetchFunction);
      expect(fetchCalled).toBe(true);
      expect(result1).toEqual({ data: 'fetched' });

      // Second call should use cache
      fetchCalled = false;
      const result2 = await cacheService.getOrSet(key, fetchFunction);
      expect(fetchCalled).toBe(false);
      expect(result2).toEqual({ data: 'fetched' });
    });
  });

  describe('Key Generation', () => {
    test('should generate namespaced keys', () => {
      const key = cacheService.generateKey('users', '123', 'profile');
      expect(key).toBe('users:123:profile');
    });

    test('should handle single part', () => {
      const key = cacheService.generateKey('global');
      expect(key).toBe('global:');
    });
  });
});

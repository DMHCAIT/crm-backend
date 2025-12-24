const cacheService = require('../services/cacheService');
const logger = require('../utils/logger');

/**
 * Middleware to cache GET requests
 * Usage: router.get('/endpoint', cacheMiddleware(300), handler)
 */
function cacheMiddleware(ttl = 300) {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip caching if disabled
    if (process.env.ENABLE_CACHE === 'false') {
      return next();
    }

    try {
      // Generate cache key from URL and query params
      const cacheKey = cacheService.generateKey(
        'api',
        req.path,
        JSON.stringify(req.query),
        req.user?.userId || 'anonymous'
      );

      // Try to get from cache
      const cachedResponse = await cacheService.get(cacheKey);
      if (cachedResponse) {
        logger.debug('Serving from cache', { path: req.path });
        return res.json(cachedResponse);
      }

      // Store original res.json
      const originalJson = res.json.bind(res);

      // Override res.json to cache the response
      res.json = function (data) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cacheService.set(cacheKey, data, ttl).catch(err => {
            logger.warn('Failed to cache response', { error: err.message });
          });
        }
        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error', { error: error.message });
      next(); // Continue without caching on error
    }
  };
}

/**
 * Middleware to invalidate cache for specific patterns
 * Usage: router.post('/endpoint', invalidateCache(['leads:*']), handler)
 */
function invalidateCache(patterns = []) {
  return async (req, res, next) => {
    try {
      // Store original res.json
      const originalJson = res.json.bind(res);

      // Override res.json to invalidate cache after successful response
      res.json = function (data) {
        // Only invalidate cache on successful mutations
        if (res.statusCode >= 200 && res.statusCode < 300) {
          Promise.all(
            patterns.map(pattern => cacheService.deletePattern(pattern))
          ).catch(err => {
            logger.warn('Failed to invalidate cache', { error: err.message });
          });
        }
        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.error('Cache invalidation middleware error', { error: error.message });
      next();
    }
  };
}

/**
 * Cache configuration presets
 */
const CachePresets = {
  SHORT: 60,        // 1 minute
  MEDIUM: 300,      // 5 minutes
  LONG: 1800,       // 30 minutes
  HOUR: 3600,       // 1 hour
  DAY: 86400        // 24 hours
};

module.exports = {
  cacheMiddleware,
  invalidateCache,
  CachePresets
};

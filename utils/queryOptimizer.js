const logger = require('../utils/logger');

/**
 * Query performance monitoring and optimization utilities
 */

/**
 * Measure query execution time
 */
async function measureQuery(queryName, queryFunction) {
  const startTime = Date.now();
  try {
    const result = await queryFunction();
    const duration = Date.now() - startTime;
    
    if (duration > 1000) {
      logger.warn('Slow query detected', { queryName, duration });
    } else {
      logger.debug('Query executed', { queryName, duration });
    }
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Query failed', { queryName, duration, error: error.message });
    throw error;
  }
}

/**
 * Batch database queries to reduce N+1 problem
 */
async function batchQuery(items, batchSize, queryFunction) {
  const results = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await queryFunction(batch);
    results.push(...batchResults);
  }
  
  return results;
}

/**
 * Optimize Supabase select query with proper indexing hints
 */
function optimizeSelect(query, options = {}) {
  const {
    limit = 100,
    orderBy = 'created_at',
    ascending = false,
    select = '*'
  } = options;

  let optimized = query.select(select);
  
  if (orderBy) {
    optimized = optimized.order(orderBy, { ascending });
  }
  
  if (limit) {
    optimized = optimized.limit(limit);
  }
  
  return optimized;
}

/**
 * Build optimized filter for common queries
 */
function buildFilter(query, filters = {}) {
  let filtered = query;
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value === null || value === undefined) {
      return; // Skip null/undefined filters
    }
    
    if (Array.isArray(value)) {
      // IN query
      filtered = filtered.in(key, value);
    } else if (typeof value === 'object') {
      // Range query
      if (value.gte !== undefined) filtered = filtered.gte(key, value.gte);
      if (value.lte !== undefined) filtered = filtered.lte(key, value.lte);
      if (value.gt !== undefined) filtered = filtered.gt(key, value.gt);
      if (value.lt !== undefined) filtered = filtered.lt(key, value.lt);
    } else {
      // Equality query
      filtered = filtered.eq(key, value);
    }
  });
  
  return filtered;
}

/**
 * Pagination helper with cursor-based pagination
 */
function paginateQuery(query, page = 1, pageSize = 50) {
  const offset = (page - 1) * pageSize;
  return query.range(offset, offset + pageSize - 1);
}

/**
 * Query result caching with automatic invalidation
 */
class QueryCache {
  constructor(cacheService) {
    this.cache = cacheService;
    this.dependencies = new Map(); // Track query dependencies
  }

  async executeWithCache(cacheKey, queryFunction, ttl = 300, dependencies = []) {
    // Store dependencies for invalidation
    dependencies.forEach(dep => {
      if (!this.dependencies.has(dep)) {
        this.dependencies.set(dep, new Set());
      }
      this.dependencies.get(dep).add(cacheKey);
    });

    return await this.cache.getOrSet(cacheKey, queryFunction, ttl);
  }

  async invalidate(dependency) {
    const affectedKeys = this.dependencies.get(dependency);
    if (affectedKeys) {
      await Promise.all(
        Array.from(affectedKeys).map(key => this.cache.delete(key))
      );
      this.dependencies.delete(dependency);
      logger.info('Invalidated cached queries', { dependency, count: affectedKeys.size });
    }
  }
}

/**
 * Database connection pooling configuration
 */
const poolConfig = {
  // Supabase handles connection pooling internally
  // These are recommendations for direct PostgreSQL connections
  max: 20,              // Maximum pool size
  min: 2,               // Minimum pool size
  idle: 10000,          // How long a client can be idle before being closed
  acquire: 30000,       // Maximum time to acquire connection
  evict: 1000,          // How often to check for idle connections
};

/**
 * Optimize query with join hints
 */
function optimizeJoin(query, joinTable, joinCondition, joinType = 'inner') {
  // Supabase uses foreign key relationships for joins
  // This is a helper to structure efficient join queries
  return query.select(`
    *,
    ${joinTable}:${joinTable}!${joinCondition}(*)
  `);
}

/**
 * Analyze query performance
 */
async function analyzeQuery(supabase, tableName, queryBuilder) {
  const startTime = Date.now();
  
  try {
    const { data, error, count } = await queryBuilder;
    const duration = Date.now() - startTime;
    
    const analysis = {
      table: tableName,
      duration,
      rowCount: count || (data ? data.length : 0),
      hasError: !!error,
      performance: duration < 100 ? 'excellent' : 
                   duration < 500 ? 'good' :
                   duration < 1000 ? 'acceptable' : 'slow'
    };
    
    if (analysis.performance === 'slow') {
      logger.warn('Slow query analysis', analysis);
    } else {
      logger.debug('Query analysis', analysis);
    }
    
    return analysis;
  } catch (error) {
    logger.error('Query analysis failed', { error: error.message });
    throw error;
  }
}

/**
 * Common query patterns for optimization
 */
const QueryPatterns = {
  // Get records with related data (avoid N+1)
  withRelations: (table, relations) => {
    const selectFields = ['*', ...relations.map(r => `${r}(*)`)].join(',');
    return table.select(selectFields);
  },

  // Get recent records efficiently
  recent: (table, limit = 10) => {
    return table
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
  },

  // Count with filter
  count: (table, filter = {}) => {
    let query = table.select('*', { count: 'exact', head: true });
    return buildFilter(query, filter);
  },

  // Exists check (faster than count)
  exists: async (table, filter = {}) => {
    const query = buildFilter(table.select('id').limit(1), filter);
    const { data } = await query;
    return data && data.length > 0;
  }
};

module.exports = {
  measureQuery,
  batchQuery,
  optimizeSelect,
  buildFilter,
  paginateQuery,
  QueryCache,
  poolConfig,
  optimizeJoin,
  analyzeQuery,
  QueryPatterns
};

/**
 * Structured Logger Utility - Phase 3 (BE-050)
 * Simple logger without circular dependencies
 */

const config = require('../config');

/**
 * Generate a unique request ID
 */
function generateRequestId() {
  const crypto = require('crypto');
  return crypto.randomBytes(8).toString('hex');
}

/**
 * Structured logger that outputs JSON in production
 */
function log(level, req, message, additionalData = {}) {
  const timestamp = new Date().toISOString();
  const requestId = req?.requestId || 'unknown';
  const method = req?.method || 'unknown';
  const path = req?.path || 'unknown';
  const userId = req?.user?.id || null;
  const userRole = req?.user?.role || null;
  
  if (config.isProd || process.env.STRUCTURED_LOG === 'true') {
    const logEntry = {
      timestamp,
      level,
      requestId,
      method,
      path,
      userId,
      userRole,
      message,
      ...additionalData,
    };
    console[level === 'error' ? 'error' : 'log'](JSON.stringify(logEntry));
  } else {
    // Development mode: simple logging
    const prefix = requestId ? `[${requestId}]` : '';
    const userInfo = userId ? ` user=${userId}(${userRole})` : '';
    console[level === 'error' ? 'error' : 'log'](`[${level.toUpperCase()}] ${prefix}${method} ${path}${userInfo} - ${message}`);
  }
}

/**
 * Log error with structured format
 */
function logError(req, err, additionalData = {}) {
  const errorData = {
    errorCode: err.code,
    errorMessage: err.message,
    ...additionalData,
  };
  
  if (err.stack && !config.isProd) {
    errorData.stack = err.stack;
  }
  
  log('error', req, err.message || 'Unknown error', errorData);
}

/**
 * Request logging middleware
 */
function requestLogger(req, res, next) {
  req.requestId = generateRequestId();
  req.startTime = process.hrtime.bigint();
  
  // Log request start
  log('info', req, 'Request started');
  
  // Add response logging
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - req.startTime) / 1_000_000;
    const statusCode = res.statusCode;
    
    log('info', req, 'Request completed', {
      statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
    });
  });
  
  res.on('close', () => {
    // Only warn if client disconnected before response finished writing
    if (!res.writableEnded) {
      const durationMs = Number(process.hrtime.bigint() - req.startTime) / 1_000_000;
      log('warn', req, 'Request closed before completion', {
        durationMs: Math.round(durationMs * 100) / 100,
      });
    }
  });
  
  next();
}

/**
 * Dependency health check
 */
async function checkDependencies() {
  const { pool } = require('../db/pool');
  
  const checks = {
    database: {
      status: 'ok',
      message: 'Connected',
    },
  };
  
  // Check database
  try {
    await pool.query('SELECT 1');
    checks.database.status = 'ok';
    checks.database.message = 'Connected';
  } catch (err) {
    checks.database.status = 'down';
    checks.database.message = err.message;
  }
  
  return checks;
}

/**
 * Enhanced health check handler
 */
async function healthCheckHandler(req, res) {
  const dbStatus = { status: 'ok', message: 'Connected' };
  const depsStatus = { status: 'ok', message: 'All dependencies healthy' };
  
  try {
    const { pool } = require('../db/pool');
    await pool.query('SELECT 1');
  } catch (err) {
    dbStatus.status = 'down';
    dbStatus.message = err.message;
    depsStatus.status = 'degraded';
    depsStatus.message = 'Database down';
  }
  
  try {
    const deps = await checkDependencies();
    if (deps.database.status !== 'ok') {
      depsStatus.status = 'degraded';
      depsStatus.dependencies = deps;
    } else {
      depsStatus.dependencies = deps;
    }
  } catch (err) {
    depsStatus.status = 'degraded';
    depsStatus.message = err.message;
  }
  
  const status = dbStatus.status === 'ok' && depsStatus.status === 'ok' ? 'ok' : 'degraded';
  const httpStatus = status === 'ok' ? 200 : 503;
  
  res.status(httpStatus).json({
    status,
    uptime_s: Math.round(process.uptime()),
    database: dbStatus,
    dependencies: depsStatus,
    requestId: req.requestId || 'unknown',
  });
}

module.exports = {
  requestLogger,
  checkDependencies,
  healthCheckHandler,
  logError,
  generateRequestId,
  log,
};

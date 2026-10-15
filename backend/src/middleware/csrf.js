const crypto = require('crypto');
const { parseToken } = require('./auth');

const config = require('../config');

// In-memory fallback map for legacy/transition tokens
const legacyTokens = new Map();

/**
 * Generate a CSRF token for the current session.
 * Uses an HMAC-signed stateless token tied to the user ID and config.jwtSecret.
 * Operates deterministically across server restarts and multiple load-balanced instances.
 */
function generateCsrfToken(userId) {
  const salt = crypto.randomBytes(8).toString('hex');
  const expiresAt = Date.now() + (15 * 60 * 1000); // 15 minutes
  const data = `${userId}:${expiresAt}:${salt}`;
  const sig = crypto.createHmac('sha256', config.jwtSecret).update(data).digest('hex');
  return `${expiresAt}.${salt}.${sig}`;
}

/**
 * Validate CSRF token.
 * Verifies signature, expiration time, and ownership by userId using constant-time comparison.
 */
function validateCsrfToken(userId, token) {
  if (!token || typeof token !== 'string') return false;

  // New HMAC token format: expiresAt.salt.sig
  if (token.includes('.')) {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const [expiresAtStr, salt, sig] = parts;
    const expiresAt = Number(expiresAtStr);
    if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;
    // Reject excessive future timestamp (clock skew > 5 min beyond default window)
    if (expiresAt > Date.now() + (25 * 60 * 1000)) return false;

    const data = `${userId}:${expiresAtStr}:${salt}`;
    const expectedSig = crypto.createHmac('sha256', config.jwtSecret).update(data).digest('hex');
    try {
      const sigBuf = Buffer.from(sig, 'hex');
      const expectedBuf = Buffer.from(expectedSig, 'hex');
      if (sigBuf.length !== expectedBuf.length) return false;
      return crypto.timingSafeEqual(sigBuf, expectedBuf);
    } catch {
      return false;
    }
  }

  // Fallback for legacy random tokens stored in memory
  const key = `${userId}:${token}`;
  const expiresAt = legacyTokens.get(key);
  if (!expiresAt) return false;
  if (Date.now() > expiresAt) {
    legacyTokens.delete(key);
    return false;
  }
  return true;
}

/**
 * Middleware to validate CSRF token for state-changing requests
 * Expects token in X-CSRF-Token header or csrfToken body field.
 * Dapat berjalan secara global — akan mem-parse JWT sendiri jika req.user belum di-set.
 */
function csrfProtection(req, res, next) {
  // Only validate for state-changing methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Determine user ID: from req.user (set by requireAuth) or parse from token
  let userId = req.user?.id;
  if (!userId) {
    const payload = parseToken(req);
    if (payload && payload !== 'invalid') {
      userId = payload.sub;
    }
  }

  // No authenticated user — let requireAuth handle this downstream
  if (!userId) {
    return next();
  }

  // Get token from header or body
  const token = req.headers['x-csrf-token'] || req.body?.csrfToken || req.body?._csrf;

  if (!token) {
    return res.status(403).json({
      error: {
        code: 'CSRF_TOKEN_MISSING',
        message: 'CSRF token diperlukan untuk permintaan ini.',
      },
    });
  }

  if (!validateCsrfToken(userId, token)) {
    return res.status(403).json({
      error: {
        code: 'CSRF_TOKEN_INVALID',
        message: 'CSRF token tidak valid atau sudah kedaluwarsa.',
      },
    });
  }

  next();
}

/**
 * Generate CSRF token endpoint handler
 */
function csrfTokenHandler(req, res) {
  const user = req.user;
  if (!user || !user.id) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Anda harus login terlebih dahulu.',
      },
    });
  }
  
  const token = generateCsrfToken(user.id);
  res.json({ csrfToken: token });
}

/**
 * Clear CSRF tokens for user (on logout)
 */
function clearCsrfTokens(userId) {
  for (const [key] of legacyTokens.entries()) {
    if (key.startsWith(`${userId}:`)) {
      legacyTokens.delete(key);
    }
  }
}

module.exports = { csrfProtection, csrfTokenHandler, clearCsrfTokens, generateCsrfToken, validateCsrfToken };

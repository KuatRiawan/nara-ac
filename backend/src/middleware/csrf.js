const crypto = require('crypto');

// In-memory store for CSRF tokens (for demo/single instance)
// In production, use Redis or database
const csrfTokens = new Map();

/**
 * Generate a CSRF token for the current session
 * Token is tied to the JWT token/subject to prevent token theft between users
 */
function generateCsrfToken(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + (15 * 60 * 1000); // 15 minutes
  
  csrfTokens.set(`${userId}:${token}`, expiresAt);
  
  return token;
}

/**
 * Validate CSRF token
 * Token must match and not be expired
 */
function validateCsrfToken(userId, token) {
  if (!token) return false;
  
  const key = `${userId}:${token}`;
  const expiresAt = csrfTokens.get(key);
  
  if (!expiresAt) return false;
  if (Date.now() > expiresAt) {
    csrfTokens.delete(key);
    return false;
  }
  
  // Token is valid - remove it (one-time use) or keep it (multiple use)
  // For now, we'll keep it for multiple use within expiry
  return true;
}

/**
 * Middleware to validate CSRF token for state-changing requests
 * Expects token in X-CSRF-Token header or csrfToken body field
 */
function csrfProtection(req, res, next) {
  // Only validate for state-changing methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  const user = req.user;
  if (!user || !user.id) {
    return next(); // Let requireAuth handle this
  }
  
  // Get token from header or body
  const token = req.headers['x-csrf-token'] || req.body.csrfToken || req.body._csrf;
  
  if (!token) {
    return res.status(403).json({
      error: {
        code: 'CSRF_TOKEN_MISSING',
        message: 'CSRF token diperlukan untuk permintaan ini.',
      },
    });
  }
  
  if (!validateCsrfToken(user.id, token)) {
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
  for (const [key] of csrfTokens.entries()) {
    if (key.startsWith(`${userId}:`)) {
      csrfTokens.delete(key);
    }
  }
}

module.exports = { csrfProtection, csrfTokenHandler, clearCsrfTokens, generateCsrfToken };

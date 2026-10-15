const jwt = require('jsonwebtoken');
const config = require('../config');
const { E } = require('../errors');

function parseToken(req) {
  // Try Authorization header first
  const h = req.headers.authorization || '';
  if (h.startsWith('Bearer ')) {
    try {
      return jwt.verify(h.slice(7), config.jwtSecret);
    } catch {
      return 'invalid';
    }
  }
  
  // Fallback to cookie-based token (for HttpOnly cookies)
  const token = req.cookies?.nara_token;
  if (token) {
    try {
      return jwt.verify(token, config.jwtSecret);
    } catch {
      return 'invalid';
    }
  }
  
  return null;
}

/** Wajib login; roles opsional (array). */
function requireAuth(roles) {
  return (req, _res, next) => {
    const p = parseToken(req);
    if (!p) return next(E.unauthorized());
    if (p === 'invalid') return next(E.unauthorized('Sesi tidak valid atau kedaluwarsa. Silakan login ulang.'));
    req.user = { id: p.sub, role: p.role, nama: p.nama, technicianId: p.tid || null, customerId: p.cid || null, customer_id: p.cid || null, technician_id: p.tid || null };
    if (roles && !roles.includes(req.user.role)) return next(E.forbidden());
    return next();
  };
}

/** Login opsional (untuk endpoint publik yang bisa dipakai admin). */
function optionalAuth(req, _res, next) {
  const p = parseToken(req);
  if (p && p !== 'invalid') req.user = { id: p.sub, role: p.role, nama: p.nama, technicianId: p.tid || null, customerId: p.cid || null, customer_id: p.cid || null, technician_id: p.tid || null };
  next();
}

function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, nama: user.nama, tid: user.technician_id || undefined, cid: user.customer_id || undefined },
    config.jwtSecret,
    { expiresIn: config.jwtExpires },
  );
}

module.exports = { requireAuth, optionalAuth, signToken, parseToken };

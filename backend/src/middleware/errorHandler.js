const { AppError } = require('../errors');
const { logError } = require('../utils/logger');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message, ...(err.detail ? { detail: err.detail } : {}) } });
  }
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Body request bukan JSON yang valid.' } });
  }
  if (err && err.type === 'entity.too.large') {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Body request terlalu besar.' } });
  }
  if (err && ['ECONNREFUSED', 'ER_ACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR'].includes(err.code)) {
    return res.status(503).json({ error: { code: 'SERVICE_UNAVAILABLE', message: 'Database tidak dapat dihubungi. Coba lagi beberapa saat.' } });
  }
  if (err && ['ER_CHECK_CONSTRAINT_VIOLATED', 'ER_CONSTRAINT_FAILED', 'ER_NO_REFERENCED_ROW_2', 'ER_ROW_IS_REFERENCED_2'].includes(err.code)) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: err.detail || 'Nilai yang dimasukkan tidak valid untuk field ini.' } });
  }
  if (err?.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: { code: 'CONFLICT', message: 'Data sudah terdaftar. Gunakan data yang berbeda.' } });
  }

  // Structured error logging (BE-050)
  if (err && err !== 'pipe') {
    logError(req, err, { statusCode: err.status || 500 });
  }

  return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan pada server. Silakan coba lagi.' } });
}

function notFoundHandler(req, _res, next) {
  next(new AppError(404, 'NOT_FOUND', `Endpoint ${req.method} ${req.originalUrl} tidak ditemukan.`));
}

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { errorHandler, notFoundHandler, wrap };

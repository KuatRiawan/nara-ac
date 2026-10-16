/** Error aplikasi dengan kontrak seragam: { error: { code, message, detail? } } */
class AppError extends Error {
  constructor(status, code, message, detail) {
    super(message);
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

const E = {
  badRequest: (message = 'Permintaan tidak valid.', detail) => new AppError(400, 'BAD_REQUEST', message, detail),
  validation: (message, detail) => new AppError(400, 'VALIDATION_ERROR', message, detail),
  unauthorized: (message = 'Autentikasi diperlukan. Silakan login.') => new AppError(401, 'UNAUTHORIZED', message),
  forbidden: (message = 'Anda tidak memiliki hak akses untuk aksi ini.') => new AppError(403, 'FORBIDDEN', message),
  notFound: (message = 'Data tidak ditemukan.') => new AppError(404, 'NOT_FOUND', message),
  conflict: (message, detail) => new AppError(409, 'CONFLICT', message, detail),
  business: (message, detail) => new AppError(422, 'BUSINESS_RULE_VIOLATION', message, detail),
  unavailable: (message, detail) => new AppError(503, 'SERVICE_UNAVAILABLE', message, detail),
};

module.exports = { AppError, E };

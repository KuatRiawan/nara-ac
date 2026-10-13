const Joi = require('joi');
const { E } = require('../errors');

const MESSAGES = {
  'any.required': '{{#label}} wajib diisi.',
  'string.empty': '{{#label}} tidak boleh kosong.',
  'string.base': '{{#label}} harus berupa teks.',
  'string.min': '{{#label}} minimal {{#limit}} karakter.',
  'string.max': '{{#label}} maksimal {{#limit}} karakter.',
  'string.email': '{{#label}} harus berupa email yang valid.',
  'string.pattern.base': '{{#label}} format tidak valid.',
  'number.base': '{{#label}} harus berupa angka.',
  'number.min': '{{#label}} minimal {{#limit}}.',
  'number.max': '{{#label}} maksimal {{#limit}}.',
  'number.integer': '{{#label}} harus bilangan bulat.',
  'number.positive': '{{#label}} harus lebih dari 0.',
  'boolean.base': '{{#label}} harus true atau false.',
  'any.only': '{{#label}} harus salah satu dari: {{#valids}}.',
  'object.unknown': 'Field "{{#label}}" tidak dikenali.',
};

/** Middleware validasi Joi. source: 'body' | 'query' | 'params'. */
function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const { value, error } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false,
      convert: true,
      messages: MESSAGES,
      errors: { wrap: { label: false, array: false } },
    });
    if (error) {
      const detail = {};
      for (const d of error.details) {
        const key = d.path.join('.') || source;
        if (!detail[key]) detail[key] = d.message;
      }
      return next(E.validation('Data yang dikirim tidak valid. Periksa kembali isian Anda.', detail));
    }
    if (source === 'query') {
      // Express 4: req.query boleh ditimpa; simpan juga di req.valid
      req.valid = { ...(req.valid || {}), query: value };
    } else {
      req[source] = value;
    }
    return next();
  };
}

module.exports = { validate, Joi };

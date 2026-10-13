const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const { pool } = require('./db/pool');
const { filePath } = require('./utils/upload');
const { errorHandler, notFoundHandler, wrap } = require('./middleware/errorHandler');
const { requestLogger, healthCheckHandler } = require('./utils/logger');

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cookieParser());
  app.use(cors({
    origin(origin, cb) {
      // Jika origin kosong (non-browser request), izinkan
      if (!origin) return cb(null, true);
      
      // Jika corsOrigins mengandung '*', harap di production tidak demikian
      // Karena credentials: true tidak kompatibel dengan origin: '*'
      if (config.corsOrigins.includes('*')) {
        // Di development, boleh untuk local testing
        if (!config.isProd) return cb(null, true);
        // Di production, jangan pernah izinkan '*' dengan credentials
        return cb(null, false);
      }
      
      // Izinkan jika origin ada di list
      if (config.corsOrigins.includes(origin)) return cb(null, true);
      
      // Di development, izinkan local origins
      if (!config.isProd && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
        return cb(null, true);
      }
      
      return cb(null, false);
    },
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    credentials: true,
    maxAge: 600,
  }));
  app.use(express.json({ limit: '50kb' }));
  app.use(rateLimit({
    windowMs: 60000, limit: 600, standardHeaders: true, legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test',
  }));

  // Request logging and correlation ID (BE-051, BE-054)
  app.use(requestLogger);

  // Health check with dependency checks (BE-052, BE-053)
  app.get('/health', wrap(healthCheckHandler));

  // Legacy simple health check for backward compatibility
  app.get('/health-simple', async (_req, res) => {
    let db = 'ok';
    try { await pool.query('SELECT 1'); } catch { db = 'down'; }
    res.status(db === 'ok' ? 200 : 503).json({ status: db === 'ok' ? 'ok' : 'degraded', database: db, uptime_s: Math.round(process.uptime()) });
  });

  const v1 = express.Router();
  v1.use('/auth', require('./routes/auth'));
  v1.use('/customer', require('./routes/customer'));
  v1.use('/', require('./routes/bookings'));
  v1.use('/', require('./routes/master'));
  v1.use('/', require('./routes/ops'));
  v1.use('/technician', require('./routes/technician'));
  v1.use('/admin', require('./routes/admin'));
  v1.get('/files/:name', (req, res, next) => {
    const p = filePath(req.params.name);
    if (!p) return next();
    return res.sendFile(p, (err) => {
      if (err) next();
    });
  });
  app.use('/api/v1', v1);

  // Swagger UI (OpenAPI)
  try {
    const swaggerUi = require('swagger-ui-express');
    const YAML = require('yaml');
    const spec = YAML.parse(fs.readFileSync(path.join(__dirname, '..', 'openapi.yaml'), 'utf8'));
    app.get('/api/openapi.json', (_req, res) => res.json(spec));
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(spec, { customSiteTitle: 'Nara AC API' }));
  } catch (e) {
    console.warn('[docs] OpenAPI tidak dimuat:', e.message);
  }

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };

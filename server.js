require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const fs = require('fs-extra');

const appConfig = require('./config/app');
const telegramConfig = require('./config/telegram');
const logger = require('./utils/logger');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const { startCleanupSchedule } = require('./utils/fileCleaner');

const uploadRoutes = require('./routes/upload');
const pdfRoutes = require('./routes/pdf');
const imageRoutes = require('./routes/image');
const userRoutes = require('./routes/user');
const fileRoutes = require('./routes/files');
const paymentRoutes = require('./routes/payment');

// Ensure runtime directories exist even on a fresh clone.
[appConfig.paths.uploadsInput, appConfig.paths.uploadsOutput, appConfig.paths.temp, appConfig.paths.logs].forEach(
  (dir) => fs.ensureDirSync(dir)
);

const app = express();

// ── Security & performance middleware ──────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false // Telegram WebApp injects inline scripts; CSP is tightened in production via a nonce if needed.
  })
);
app.use(cors());
app.use(compression());
app.use(morgan(appConfig.env === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Static frontend (the Telegram Mini App itself) ─────────────────
app.use(express.static(appConfig.paths.public));

// ── API routes ───────────────────────────────────────────────────────
app.use('/api', apiLimiter);
app.use('/api/upload', uploadRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/image', imageRoutes);
app.use('/api/user', userRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/payment', paymentRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'PDF Pro AI', time: new Date().toISOString() }));

// Fallback to index.html for any non-API route so client-side navigation works.
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(require('path').join(appConfig.paths.public, 'index.html'));
});

app.use('/api', notFound);
app.use(errorHandler);

app.listen(appConfig.port, () => {
  logger.info(`PDF Pro AI server running on port ${appConfig.port} [${appConfig.env}]`);
  logger.info(`Mini App URL: ${telegramConfig.miniAppUrl || appConfig.appUrl}`);

  startCleanupSchedule();

  // Initialize the Telegram bot after the HTTP server is up.
  require('./bot/bot').initBot();
});

module.exports = app;

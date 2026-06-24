import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from backend directory
dotenv.config();

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import connectDB from './config/db';
import { secureHeaders } from './middleware/secureHeaders';
import { apiLimiter } from './middleware/rateLimiter';
import { requestLogger } from './middleware/requestLogger';
import { ensureSuperAdmin } from './services/superAdminService';

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import statementRoutes from './routes/statements';
import analyticsRoutes from './routes/analytics';
import activityRoutes from './routes/activity';
import settingsRoutes from './routes/settings';

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

// Connect to Database
// ── Global Middlewares ──

// Apply secure HTTP headers via helmet
app.use(secureHeaders);

app.use(
  cors({
    origin: (origin, callback) => {
      callback(null, origin || true);
    },
    credentials: true,
  })
);

// Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Request logger (logs metadata, not bodies)
app.use(requestLogger);

// Global API Rate Limiter
app.use('/api', apiLimiter);

// ── Route Bindings ──
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/statements', statementRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/settings', settingsRoutes);

// ── Error Handling Middleware ──
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Unhandled Error]', err);
  res.status(500).json({
    message: 'An unexpected server error occurred',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

async function startServer() {
  await connectDB();
  await ensureSuperAdmin();

  const server = app.listen(Number(PORT), HOST, () => {
    console.log(`[Server] StatementPro backend is running on http://${HOST}:${PORT}`);
  });

  return server;
}

startServer().catch((error) => {
  console.error('[Server] Failed to start backend:', error);
  process.exit(1);
});

export default app;

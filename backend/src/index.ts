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

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import statementRoutes from './routes/statements';
import analyticsRoutes from './routes/analytics';
import activityRoutes from './routes/activity';
import settingsRoutes from './routes/settings';

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB();

// ── Global Middlewares ──

// Apply secure HTTP headers via helmet
app.use(secureHeaders);

// CORS configuration (allow cookies/credentials and restrict origin)
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://127.0.0.1:3000'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
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

// Bind to 127.0.0.1 for testing security compliance
const server = app.listen(Number(PORT), '127.0.0.1', () => {
  console.log(`[Server] StatementPro backend is running on http://127.0.0.1:${PORT}`);
  console.log(`[Server] Listening restricted to localhost/127.0.0.1`);
});

export default app;

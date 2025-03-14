// server.js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { setupRoutes } from './routes/index.js';
import logger from './utils/logger.js';
import requestLogger from './middleware/requestLogger.js';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Set up middleware
app.use(helmet());

// Configure CORS for different environments
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  preflightContinue: false,
  optionsSuccessStatus: 204
};
app.use(cors(corsOptions));

// Middleware to capture raw body for Stripe webhooks
app.use((req, res, next) => {
  if (req.originalUrl === '/api/stripe/webhook') {
    let rawBody = '';
    req.on('data', (chunk) => {
      rawBody += chunk.toString();
    });
    req.on('end', () => {
      req.rawBody = rawBody;
      next();
    });
  } else {
    next();
  }
});

// JSON and URL-encoded parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// Add request logger middleware
app.use(requestLogger);

// Serve static files from the uploads directory
app.use('/uploads', express.static('routes/uploads'));

// Add a root route for health checks
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Artifact API is running',
    version: '1.0.0',
    docs: `${process.env.API_URL || req.protocol + '://' + req.get('host')}/api-docs`
  });
});

// Set up routes
setupRoutes(app);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Server error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500
    }
  });
});

// Start the server
const PORT = parseInt(process.env.PORT || '3002', 10);
const HOST = process.env.HOST || '0.0.0.0';

// Log important environment variables for debugging
logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
logger.info(`Port from environment: ${process.env.PORT}`);

app.listen(PORT, HOST, () => {
  logger.info(`Server running on ${HOST}:${PORT}`);
  logger.info(`API documentation available at ${process.env.API_URL || `http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`}/api-docs`);
  logger.info(`Health check endpoint: ${process.env.API_URL || `http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`}/`);
});

export default app; 
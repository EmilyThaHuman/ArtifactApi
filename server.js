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

// Add debug route to check all registered routes
app.get('/routes', (req, res) => {
  const routes = [];
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      // Routes registered directly on the app
      routes.push({
        path: middleware.route.path,
        method: Object.keys(middleware.route.methods)[0].toUpperCase(),
      });
    } else if (middleware.name === 'router') {
      // Router middleware
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          const path = handler.route.path;
          const method = Object.keys(handler.route.methods)[0].toUpperCase();
          routes.push({
            path: middleware.regexp.toString().includes('/api') ? `/api${path}` : path,
            method,
          });
        }
      });
    }
  });
  
  res.json({
    routes,
    info: 'This is a debug endpoint to list all registered routes'
  });
});

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

// Add a direct route to handle /serper/searchV2 requests (non-prefixed version)
app.post('/serper/searchV2', (req, res) => {
  // Redirect to the correct API endpoint
  logger.info('Received request to /serper/searchV2, redirecting to /api/serper/searchV2');
  req.url = '/api/serper/searchV2';
  app._router.handle(req, res);
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
const HOST = '0.0.0.0'; // Force to 0.0.0.0 for Render deployment

// Get the public URL for the service
const getPublicUrl = () => {
  if (process.env.API_URL) return process.env.API_URL;
  if (process.env.NODE_ENV === 'production') return `https://${process.env.RENDER_EXTERNAL_URL || 'your-app.onrender.com'}`;
  return `http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`;
};

// Log important environment variables for debugging
logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
logger.info(`Port from environment: ${process.env.PORT}`);
logger.info(`Host: ${HOST}`);

app.listen(PORT, HOST, () => {
  const publicUrl = getPublicUrl();
  logger.info(`Server running on ${HOST}:${PORT}`);
  logger.info(`Public URL: ${publicUrl}`);
  logger.info(`API documentation available at ${publicUrl}/api-docs`);
  logger.info(`Health check endpoint: ${publicUrl}/`);
});

export default app; 
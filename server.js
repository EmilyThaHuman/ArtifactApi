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
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// Add request logger middleware
app.use(requestLogger);

// Serve static files from the uploads directory
app.use('/uploads', express.static('routes/uploads'));

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
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`API documentation available at http://localhost:${PORT}/api-docs`);
});

export default app; 
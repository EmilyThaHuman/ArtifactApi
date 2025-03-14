// middleware/requestLogger.js
import logger from '../utils/logger.js';
import dotenv from 'dotenv';

dotenv.config();

// Environment configuration
const LOG_REQUEST_BODY = process.env.LOG_REQUEST_BODY === 'true';
const LOG_RESPONSE_BODY = process.env.LOG_RESPONSE_BODY === 'true';

/**
 * Middleware to log information about incoming requests
 */
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Prepare request log data
  const logData = {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    contentType: req.get('content-type'),
  };

  // Include request body for non-GET requests if enabled
  if (LOG_REQUEST_BODY && req.method !== 'GET' && req.body) {
    try {
      // Limit body size to avoid huge logs
      logData.body = JSON.stringify(req.body).substring(0, 500);
    } catch (err) {
      logData.bodyError = 'Could not stringify request body';
    }
  }

  // Log incoming request
  logger.info(`Request: ${req.method} ${req.originalUrl}`, logData);

  // Store original response methods
  const originalSend = res.send;
  const originalJson = res.json;
  let responseBody;

  // Override response methods to capture response body if enabled
  if (LOG_RESPONSE_BODY) {
    res.send = function (body) {
      responseBody = body;
      return originalSend.apply(res, arguments);
    };
    
    res.json = function (body) {
      responseBody = body;
      return originalJson.apply(res, arguments);
    };
  }

  // Capture response information after it's sent
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'error' : 'info';
    
    // Prepare response log data
    const responseData = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('content-length'),
      contentType: res.get('content-type')
    };

    // Include response body if enabled
    if (LOG_RESPONSE_BODY && responseBody) {
      try {
        // Limit response body size to avoid huge logs
        if (typeof responseBody === 'string') {
          responseData.body = responseBody.substring(0, 500);
        } else {
          responseData.body = JSON.stringify(responseBody).substring(0, 500);
        }
      } catch (err) {
        responseData.bodyError = 'Could not stringify response body';
      }
    }

    // Log response with appropriate log level
    if (logLevel === 'error') {
      logger.error(`Response: ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`, responseData);
    } else {
      logger.info(`Response: ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`, responseData);
    }
  });

  next();
};

export default requestLogger; 
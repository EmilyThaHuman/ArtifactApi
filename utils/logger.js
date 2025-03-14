// utils/logger.js

// A simple logger utility with enhanced functionality
const logger = {
  info: (message, metadata = {}) => {
    const metadataStr = Object.keys(metadata).length 
      ? `\n${JSON.stringify(metadata, null, 2)}` 
      : '';
    console.log(`[INFO] ${new Date().toISOString()} - ${message}${metadataStr}`);
  },
  
  error: (message, metadata = {}) => {
    const metadataStr = Object.keys(metadata).length 
      ? `\n${JSON.stringify(metadata, null, 2)}` 
      : '';
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}${metadataStr}`);
  },
  
  warn: (message, metadata = {}) => {
    const metadataStr = Object.keys(metadata).length 
      ? `\n${JSON.stringify(metadata, null, 2)}` 
      : '';
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}${metadataStr}`);
  },
  
  debug: (message, metadata = {}) => {
    if (process.env.NODE_ENV === 'development') {
      const metadataStr = Object.keys(metadata).length 
        ? `\n${JSON.stringify(metadata, null, 2)}` 
        : '';
      console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}${metadataStr}`);
    }
  }
};

export default logger; 
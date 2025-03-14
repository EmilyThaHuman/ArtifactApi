import path from 'path'
import { fileURLToPath } from 'url'

// Fix for ES modules __dirname equivalent
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const perplexityConfig = {
  model: 'llama-3.1-sonar-small-128k-online',
  return_citations: true,
  return_images: false,
  search_recency_filter: 'month',
  stream: false,
  max_tokens: 1024,
  temperature: 0.5
}

// backend/config/crawler.js (optional configuration)
export const CRAWLER_CONFIG = {
  DEFAULT_MAX_REQUESTS: 50,
  DEFAULT_DEPTH: 2,
  DEFAULT_TIMEOUT: 60000,
  DEFAULT_PATTERNS: {
    EXCLUDE: [
      '\\.(pdf|zip|doc|docx|xls|xlsx)$',
      'logout',
      'signout',
      'unsubscribe'
    ],
    INCLUDE: []
  },
  RATE_LIMIT: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 10
  }
}

// Add auth configuration
const authConfig = {
  cookie: {
    secret: process.env.COOKIE_SECRET || 'your-secret-key',
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-jwt-secret',
    expiresIn: '24h'
  }
}

export const config = {
  root: path.normalize(__dirname + '/..'),
  node: {
    env: process.env.NODE_ENV || 'development',
    envFile: '.env',
    envPath: path.join(__dirname, '..', '..', '.env')
  },
  auth: authConfig,
  app: {
    name: 'ReedAiAssistantServicesAPI',
    description: '--- ReedAiAssistantServicesAPI ---',
    version: '1.0.0',
    host: process.env.HOST || 'localhost',
    port: parseInt(process.env.PORT, 10) || 3002,
    url: process.env.URL || 'http://localhost:3002',
    env: {
      /* --- OpenAI: OpenAI API Key --- */
      openAiApiKey: process.env.OPENAI_API_PROJECT_KEY,
      /* --- Perplexity: Perplexity API Key --- */
      perplexityApiKey: process.env.PERPLEXITY_API_PROJECT_KEY,
      /* --- Anthropic: Anthropic API Key --- */
      anthropicApiKey: process.env.ANTHROPIC_API_PROJECT_KEY,
      /* --- Groq: Groq API Key --- */
      groqApiKey: process.env.GROQ_API_PROJECT_KEY,
      /* --- Google Gemini: Google Gemini API Key --- */
      googleGeminiApiKey: process.env.GOOGLE_API_PROJECT_KEY,
      /* --- Mistral: Mistral API Key --- */
      mistralApiKey: process.env.MISTRAL_API_PROJECT_KEY,
      /* --- Pinecone: Pinecone API Key and Index Name --- */
      pineconeApiKey: process.env.PINECONE_API_PROJECT_KEY,
      pineconeIndexName: process.env.PINECONE_INDEX_NAME || 'namespace-notes'
    },
    express: {
      trustProxy: true,
      json: {
        limit: '1mb'
      },
      urlencoded: {
        extended: true,
        limit: '1mb'
      }
    },
    middlewares: {
      cors: {
        origin: ['http://localhost:3000', '*'],
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
        optionsSuccessStatus: 200
      },
      rateLimit: {
        windowMs: 15 * 60 * 1000,
        max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100
      },
      security: {
        helmet: {
          contentSecurityPolicy: {
            directives: {
              defaultSrc: ["'self'"],
              styleSrc: ["'self'", 'https://fonts.googleapis.com']
            }
          }
        }
      },
      compression: {
        threshold: 512
      },
      staticFiles: {
        public: path.join(__dirname, '..', 'public'),
        uploads: path.join(__dirname, '..', 'uploads'),
        dirs: ['static', 'uploads', 'static/images', 'static/files']
      }
    },
    uploads: {
      directory: path.join(__dirname, '..', 'uploads'),
      maxSize: 25 * 1024 * 1024, // 25MB
      allowedTypes: ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png'],
      route: '/uploads'
    }
  },
  api: {
    port: parseInt(process.env.PORT, 10) || 3002,
    host: process.env.HOST || 'localhost'
  }
}

export default config

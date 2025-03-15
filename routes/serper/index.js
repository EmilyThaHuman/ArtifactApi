/**
 * search-api.js
 *
 * This Express router handles search and places functionality with Serper's APIs.
 * Includes:
 * - Rate limiting to prevent abuse
 * - Retries with exponential backoff (axiosRetry)
 * - Careful error handling and status codes
 * - Input validation and sanitization for queries
 * - Caching headers for performance
 */

import axios from 'axios'
import axiosRetry from 'axios-retry'
import dotenv from 'dotenv'
import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { handleSearch, handleSearchV2, handlePlacesSearch } from './serper.js'

dotenv.config()

const router = Router()

const SERPER_BASE_URL = 'https://google.serper.dev'
const SERPER_API_KEY = process.env.GOOGLE_SERPER_API_KEY

// ------------------------------------------------------
// 1. Rate Limiting
// ------------------------------------------------------
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later' }
})
router.use(limiter)

// ------------------------------------------------------
// 2. Axios Retries
//    Retries up to 3 times with exponential backoff
// ------------------------------------------------------
axiosRetry(axios, {
  retries: 3,
  retryDelay: (retryCount) => Math.pow(2, retryCount) * 1000,
  retryCondition: (error) => {
    const shouldRetry =
      axiosRetry.isNetworkOrIdempotentRequestError(error) ||
      error.response?.status === 503
    if (shouldRetry) {
      console.error(
        `Request failed with status ${error.response?.status}. Retrying...`
      )
    }
    return shouldRetry
  }
})

// ------------------------------------------------------
// 3. Search Endpoint
//    - Checks for query
//    - Calls Serper general search
//    - Scrapes first 5 organic results
//    - Fetches images
//    - Returns aggregated data
// ------------------------------------------------------
router.post('/search', handleSearch)

// Add the original route
router.post('/searchV2', handleSearchV2)

// Add alternative routes with different case patterns to make it more robust
router.post('/searchv2', handleSearchV2)
router.post('/SearchV2', handleSearchV2)
router.post('/SEARCHV2', handleSearchV2)

// ------------------------------------------------------
// 4. Places Search Endpoint
//    - Calls Serper Places API
//    - Normalizes data
//    - Returns cached response if valid
// ------------------------------------------------------
router.post('/places', handlePlacesSearch)

export default router

/**
 * SECURITY NOTES
 * - Make sure to validate and sanitize all inputs to avoid SSRF or malicious queries.
 * - Do not expose secrets in client side code; keep process.env vars on the server.
 *
 * PERFORMANCE TIPS
 * - Cache frequent queries in memory (e.g., using a library like 'node-cache' or Redis).
 * - Use compression middleware (e.g. 'compression') for responses to reduce network load.
 * - Limit concurrency if needed (e.g. with p-limit) to avoid overwhelming external APIs.
 *
 * AI BEST PRACTICES
 * - (Currently, this endpoint calls Serper APIs for search & scraping, not direct AI usage.)
 * - If you plan to integrate an LLM for query interpretation, ensure prompts are sanitized.
 * - Log and monitor usage to detect anomalies and handle potential misuse.
 */

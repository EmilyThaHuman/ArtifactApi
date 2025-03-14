import FirecrawlApp from '@mendable/firecrawl-js'
import dotenv from 'dotenv'
dotenv.config()

// Initialize FirecrawlApp with environment variable
export const firecrawl = new FirecrawlApp({
  apiKey: process.env.FIRECRAWL_API_KEY
})

export default firecrawl

import express from 'express'
import { rateLimit } from 'express-rate-limit'
import OpenAI from 'openai'
import { z } from 'zod'
import { Router } from 'express'
import dotenv from 'dotenv'

// Import handlers from module files
import { 
  validateChatInput, 
  validateEmbeddingsInput, 
  generateChatCompletion, 
  generateEmbeddings 
} from './completion.js'

import { 
  validateImageInput, 
  generateImage, 
  healthCheck 
} from './image.js'

dotenv.config()

const router = Router()

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// Rate limiting middleware
const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: { error: 'Too many requests, please try again later' }
})

const imageLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 25, // limit each IP to 25 requests per windowMs
  message: { error: 'Too many image requests, please try again later' }
})

const embeddingsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many embedding requests, please try again later' }
})

// Chat completion route
router.post('/chat', chatLimiter, validateChatInput, generateChatCompletion)

// Embeddings route
router.post('/embeddings', embeddingsLimiter, validateEmbeddingsInput, generateEmbeddings)

// Image generation route
router.post('/images/generate', imageLimiter, validateImageInput, generateImage)

// Health check endpoint
router.get('/health', healthCheck)

export default router

// Usage example in main app:
/*
import imageRouter from './routes/image-generation';
app.use('/api/images', imageRouter);

// Example request:
POST /api/images/generate
{
  "prompt": "A serene lake at sunset with mountains in the background",
  "size": "1024x1024",
  "quality": "hd",
  "style": "natural",
  "n": 1
}
*/

import OpenAI from 'openai'
import { z } from 'zod'
import logger from '../../utils/logger.js'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// Request validation schema
const imageGenerationSchema = z.object({
  prompt: z.string().min(1).max(1000),
  size: z.enum(['1024x1024', '1792x1024', '1024x1792']).default('1024x1024'),
  quality: z.enum(['standard', 'hd']).default('standard'),
  style: z.enum(['vivid', 'natural']).default('vivid'),
  n: z.number().int().min(1).max(10).default(1)
})

// Input validation middleware
export const validateImageInput = (req, res, next) => {
  try {
    const validated = imageGenerationSchema.parse(req.body)
    req.validatedBody = validated
    next()
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'Invalid request parameters',
      details: error.errors
    })
  }
}

// Main handler function
export const generateImage = async (req, res) => {
  const { prompt, size, quality, style, n } = req.validatedBody || req.body
  
  try {
    // Track request start time for logging
    const startTime = Date.now()

    // Call OpenAI API
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      size,
      quality,
      style,
      n
    })

    // Log completion time and prompt
    const completionTime = Date.now() - startTime
    logger.info(`Image generation completed in ${completionTime}ms for prompt: ${prompt}`)

    // Format successful response
    res.json({
      success: true,
      data: {
        images: response.data,
        prompt,
        metadata: {
          model: 'dall-e-3',
          size,
          quality,
          style,
          completionTime
        }
      }
    })
  } catch (error) {
    // Handle different types of errors
    const errorResponse = {
      success: false,
      error: 'Image generation failed',
      details: error.message
    }

    // Add specific error handling for common OpenAI errors
    if (error.code === 'insufficient_quota') {
      errorResponse.error = 'API quota exceeded'
      res.status(402).json(errorResponse)
    } else if (error.code === 'content_policy_violation') {
      errorResponse.error = 'Content policy violation'
      res.status(400).json(errorResponse)
    } else {
      // Log unexpected errors for debugging
      logger.error('Image generation error:', error)
      res.status(500).json(errorResponse)
    }
  }
}

// Health check function
export const healthCheck = (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString()
  })
}

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

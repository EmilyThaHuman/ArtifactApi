import OpenAI from 'openai';
import { z } from 'zod';
import logger from '../../utils/logger.js';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Request validation schemas
const chatCompletionSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['system', 'user', 'assistant']),
      content: z.string().min(1)
    })
  ).min(1),
  model: z.string().default('gpt-4'),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().positive().optional(),
  top_p: z.number().min(0).max(1).optional(),
  frequency_penalty: z.number().min(-2).max(2).optional(),
  presence_penalty: z.number().min(-2).max(2).optional()
});

const embeddingsSchema = z.object({
  input: z.union([z.string(), z.array(z.string())]),
  model: z.string().default('text-embedding-3-small')
});

// Handler Functions
export const validateChatInput = (req, res, next) => {
  try {
    const validated = chatCompletionSchema.parse(req.body);
    req.validatedBody = validated;
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'Invalid request parameters',
      details: error.errors
    });
  }
};

export const validateEmbeddingsInput = (req, res, next) => {
  try {
    const validated = embeddingsSchema.parse(req.body);
    req.validatedBody = validated;
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'Invalid request parameters',
      details: error.errors
    });
  }
};

export const generateChatCompletion = async (req, res) => {
  try {
    const { messages, model, temperature, max_tokens, top_p, frequency_penalty, presence_penalty } = req.validatedBody || req.body;
    
    // Track request start time for logging
    const startTime = Date.now();
    
    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens,
      top_p,
      frequency_penalty,
      presence_penalty
    });
    
    // Log completion time
    const completionTime = Date.now() - startTime;
    logger.info(`Chat completion completed in ${completionTime}ms for model: ${model}`);
    
    // Format successful response
    res.json({
      success: true,
      completion: response.choices[0]?.message?.content || '',
      usage: response.usage,
      model: response.model
    });
  } catch (error) {
    // Handle different types of errors
    const errorResponse = {
      success: false,
      error: 'Chat completion failed',
      details: error.message
    };
    
    logger.error('OpenAI API error:', error);
    
    if (error.code === 'insufficient_quota') {
      errorResponse.error = 'API quota exceeded';
      res.status(402).json(errorResponse);
    } else if (error.code === 'content_policy_violation') {
      errorResponse.error = 'Content policy violation';
      res.status(400).json(errorResponse);
    } else {
      res.status(error.status || 500).json(errorResponse);
    }
  }
};

export const generateEmbeddings = async (req, res) => {
  try {
    const { input, model } = req.validatedBody || req.body;
    
    // Track request start time for logging
    const startTime = Date.now();
    
    // Call OpenAI API
    const response = await openai.embeddings.create({
      model,
      input,
    });
    
    // Log completion time
    const completionTime = Date.now() - startTime;
    logger.info(`Embeddings generated in ${completionTime}ms for model: ${model}`);
    
    // Format successful response
    res.json({
      success: true,
      embeddings: response.data,
      usage: response.usage,
      model: response.model
    });
  } catch (error) {
    logger.error('OpenAI API error:', error);
    
    res.status(error.status || 500).json({
      success: false,
      error: 'Embeddings generation failed',
      details: error.message
    });
  }
};

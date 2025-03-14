import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import dotenv from 'dotenv';
import { validateImageInput, generateImage } from '../openai/image.js';

dotenv.config();

const router = Router();

// Rate limiting
const imageLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 25, // limit each IP to 25 requests per windowMs
  message: { error: 'Too many image generation requests, please try again later' }
});

// Apply rate limiting to image generation endpoint
router.post('/generate', imageLimiter, validateImageInput, generateImage);

export default router; 
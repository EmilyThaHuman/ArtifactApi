import express from 'express'

import logger from '../../utils/logger.js'

import { extract } from './extractor.js'
import scrapeUrl from './scraper.js'
import generateWebDocuments from './web-document.js'

const router = express.Router()

/**
 * @openapi
 * /api/firecrawl/scrape:
 *   post:
 *     tags:
 *       - Firecrawl
 *     summary: Scrape a website using Firecrawl API
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - messages
 *               - shadcn
 *               - model
 */
router.post('/scrape', async (req, res) => {
  try {
    const { url, waitTime = 2000 } = req.body
    const results = await scrapeUrl(url, waitTime)
    res.json({
      success: true,
      data: results,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Together generate error:', error)
    res.status(500).json({
      error: 'Generate request failed',
      message: error.message
    })
  }
})

/**
 * @openapi
 * /api/firecrawl/extract:
 *   post:
 *     tags:
 *       - Firecrawl
 *     summary: Extract structured data from a website using Firecrawl LLM
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 */
router.post('/extract', async (req, res) => {
  try {
    const {
      url,
      waitTime = 2000,
      format = 'markdown',
      extractSchema,
      actions = []
    } = req.body

    if (!url) {
      return res.status(400).json({ error: 'URL is required' })
    }

    // Configure extraction options
    const options = {
      formats: [format],
      actions: [{ type: 'wait', milliseconds: waitTime }, ...actions]
    }

    // Add extraction schema if provided
    if (extractSchema) {
      options.extract = {
        schema: extractSchema
      }
    }

    const response = await extract(url, options)

    res.json(response)
  } catch (error) {
    logger.error('Firecrawl extract error:', error)
    res.status(500).json({
      error: 'Extract request failed',
      message: error.message
    })
  }
})

/**
 * @openapi
 * /api/firecrawl/web-document:
 *   post:
 *     tags:
 *       - Firecrawl
 *     summary: Generate web documents from multiple URLs using Firecrawl
 *     description: Process multiple URLs to extract markdown content and return a standardized format
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - urls
 *             properties:
 *               urls:
 *                 type: array
 *                 description: Array of URLs to process
 *                 items:
 *                   type: string
 *               waitTime:
 *                 type: integer
 *                 description: Wait time in milliseconds before scraping each page
 *                 default: 2000
 *     responses:
 *       200:
 *         description: Successfully processed URLs
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Server error
 */
router.post('/web-document', async (req, res) => {
  try {
    const { urls, waitTime = 2000 } = req.body

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one URL is required'
      })
    }

    // Set a reasonable limit on the number of URLs to process per request
    const maxBatchSize = 10
    if (urls.length > maxBatchSize) {
      return res.status(400).json({
        success: false,
        error: `Too many URLs. Maximum of ${maxBatchSize} URLs allowed per request.`
      })
    }

    const options = {
      waitTime
    }

    const results = await generateWebDocuments(urls, options)

    if (!results.success) {
      return res.status(500).json(results)
    }

    res.json(results)
  } catch (error) {
    logger.error('Web document generation error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to generate web documents',
      message: error.message
    })
  }
})

export default router

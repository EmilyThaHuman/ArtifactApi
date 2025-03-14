// backend/routes/screenshot.js
import fs from 'fs/promises'
import path from 'path'

import { PlaywrightCrawler } from 'crawlee'
import express from 'express'
import { rateLimit } from 'express-rate-limit'
// import { fileTypeFromBuffer } from 'file-type'

import { CrawlerController } from '../../controllers/crawlerController.js'
import { Router } from 'express'
import { CheerioCrawler, createPlaywrightRouter } from 'crawlee'
import dotenv from 'dotenv'

dotenv.config()

const router = Router()
const crawlerController = new CrawlerController()

// Rate limiting middleware
const crawlerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 crawls per window
  message: { error: 'Too many crawl requests, please try again later' }
})
// Rate limiting middleware
const screenshotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many screenshot requests, please try again later' }
})

// Validation middleware
const validateScreenshotRequest = (req, res, next) => {
  const { url } = req.body

  if (!url) {
    return res.status(400).json({
      error: 'URL is required'
    })
  }

  try {
    new URL(url.startsWith('http') ? url : `https://${url}`)
    next()
  } catch (error) {
    res.status(400).json({
      error: 'Invalid URL format'
    })
  }
}
// Validation middleware
const validateCrawlerRequest = (req, res, next) => {
  const { url, maxRequests, depth } = req.body

  if (!url) {
    return res.status(400).json({
      error: 'URL is required'
    })
  }

  // Validate URL format
  try {
    new URL(url.startsWith('http') ? url : `https://${url}`)
  } catch (error) {
    return res.status(400).json({
      error: 'Invalid URL format'
    })
  }

  // Validate numeric parameters
  if (maxRequests && (!Number.isInteger(maxRequests) || maxRequests < 1)) {
    return res.status(400).json({
      error: 'maxRequests must be a positive integer'
    })
  }

  if (depth && (!Number.isInteger(depth) || depth < 1)) {
    return res.status(400).json({
      error: 'depth must be a positive integer'
    })
  }

  next()
}

export async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { url, options = {} } = req.body

    if (!url) {
      return res.status(400).json({ error: 'URL is required' })
    }

    // Configure crawler
    const crawler = new PlaywrightCrawler({
      maxRequestsPerCrawl: 1,
      // Recommended Crawlee settings for screenshots
      headless: true,
      useChrome: false,
      requestHandlerTimeoutSecs: 60,
      navigationTimeoutSecs: 30,
      maxRequestRetries: 1,

      async requestHandler({ page }) {
        await page.setViewportSize({ width: 1280, height: 800 })

        // Wait for selector if specified
        if (options.waitForSelector) {
          await page.waitForSelector(options.waitForSelector)
        }

        // Take screenshot
        const screenshot = await page.screenshot({
          fullPage: options.fullPage ?? true,
          type: 'jpeg',
          quality: options.quality ?? 80
        })

        // Create uploads directory if it doesn't exist
        const uploadDir = path.join(process.cwd(), 'public/uploads/screenshots')
        await fs.mkdir(uploadDir, { recursive: true })

        // Generate unique filename
        const timestamp = Date.now()
        const filename = `screenshot-${timestamp}.jpg`
        const filepath = path.join(uploadDir, filename)

        // Save screenshot
        await fs.writeFile(filepath, screenshot)

        // Return relative URL path
        return {
          imageUrl: `/uploads/screenshots/${filename}`,
          metadata: {
            timestamp: new Date().toISOString(),
            format: 'jpeg',
            quality: options.quality ?? 80,
            fullPage: options.fullPage ?? true
          }
        }
      }
    })

    // Run crawler
    const results = await crawler.run([url])
    const result = results[0]

    if (!result?.imageUrl) {
      throw new Error('Failed to capture screenshot')
    }

    res.status(200).json(result)
  } catch (error) {
    console.error('Screenshot error:', error)
    res.status(500).json({
      error: 'Failed to capture screenshot',
      details: error.message
    })
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb'
    }
  }
}

router.post(
  '/screenshot',
  screenshotLimiter,
  validateScreenshotRequest,
  handler
)

router.post(
  '/crawl-site',
  crawlerLimiter,
  validateCrawlerRequest,
  crawlerController.crawlSite.bind(crawlerController)
)

/**
 * @swagger
 * /api/crawlee/scrape:
 *   post:
 *     summary: Scrape a website using Crawlee
 *     description: Extract content from a website using Cheerio crawler
 *     tags: [Crawling]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *             properties:
 *               url:
 *                 type: string
 *                 description: URL to scrape
 *               selector:
 *                 type: string
 *                 description: CSS selector to extract content
 *                 default: body
 *               maxPages:
 *                 type: integer
 *                 description: Maximum number of pages to scrape
 *                 default: 1
 *     responses:
 *       200:
 *         description: Scraped content
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/scrape', async (req, res) => {
  try {
    const { url, selector = 'body', maxPages = 1 } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Store results
    let results = [];

    // Create crawler
    const crawler = new CheerioCrawler({
      maxRequestsPerCrawl: maxPages,
      async requestHandler({ request, $ }) {
        const pageTitle = $('title').text();
        const pageContent = $(selector).text();
        
        // Extract links
        const links = [];
        $('a').each((index, element) => {
          const href = $(element).attr('href');
          const text = $(element).text();
          if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
            links.push({ href, text: text.trim() });
          }
        });

        results.push({
          url: request.url,
          title: pageTitle,
          content: pageContent,
          links,
          timestamp: new Date().toISOString()
        });
      },
    });

    // Run the crawler and wait for it to finish
    await crawler.run([url]);

    res.json({ results });
  } catch (error) {
    console.error('Crawlee error:', error);
    res.status(500).json({
      error: error.message || 'An error occurred while crawling the website',
    });
  }
});

/**
 * @swagger
 * /api/crawlee/extract-text:
 *   post:
 *     summary: Extract text content from a webpage
 *     description: Extract and clean text content from a URL
 *     tags: [Crawling]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *             properties:
 *               url:
 *                 type: string
 *                 description: URL to extract text from
 *     responses:
 *       200:
 *         description: Extracted text content
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/extract-text', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Store results
    let content = '';

    // Create crawler
    const crawler = new CheerioCrawler({
      maxRequestsPerCrawl: 1,
      async requestHandler({ $, request }) {
        // Remove script and style elements
        $('script, style, noscript, iframe, img').remove();
        
        // Get text and clean it
        const pageTitle = $('title').text().trim();
        
        // Process text by sections
        const sections = [];
        
        // Extract headings and their content
        $('h1, h2, h3, h4, h5, h6, p').each((_, element) => {
          const text = $(element).text().trim();
          if (text) {
            const tagName = element.tagName.toLowerCase();
            if (tagName.startsWith('h')) {
              sections.push({ type: 'heading', level: parseInt(tagName.substring(1)), text });
            } else {
              sections.push({ type: 'paragraph', text });
            }
          }
        });
        
        // Combine content with structure
        content = {
          url: request.url,
          title: pageTitle,
          sections,
          timestamp: new Date().toISOString()
        };
      },
    });

    // Run the crawler and wait for it to finish
    await crawler.run([url]);

    res.json(content);
  } catch (error) {
    console.error('Crawlee error:', error);
    res.status(500).json({
      error: error.message || 'An error occurred while extracting text from the website',
    });
  }
});

export default router

// routes/firecrawl/scraper.js
import { firecrawl } from '../../config/firecrawl.js'

export const scrapeUrl = async (url, waitTime = 2000) => {
  try {
    if (!url) {
      return { error: 'URL is required' }
    }

    // Configure scraping options
    const scrapeResult = await firecrawl.scrapeUrl(url, {
      formats: ['markdown'],
      actions: [{ type: 'wait', milliseconds: waitTime }, { type: 'scrape' }]
    })

    if (!scrapeResult.success) {
      return { error: `Failed to scrape: ${scrapeResult.error}` }
    }

    // Return markdown content
    return {
      success: true,
      content: scrapeResult.markdown,
      metadata: {
        url,
        scraped_at: new Date().toISOString()
      }
    }
  } catch (error) {
    console.error('Scraper error:', error)
    return {
      error: 'Failed to scrape website',
      details: error.message
    }
  }
}

export default scrapeUrl

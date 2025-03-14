import { firecrawl } from '../../config/firecrawl.js'
import logger from '../../utils/logger.js'

export const extract = async (url, options) => {
  try {
    const result = await firecrawl.scrapeUrl(url, options)

    if (!result.success) {
      throw new Error(`Failed to extract: ${result.error}`)
    }

    // Process and return the results
    const response = {
      success: true,
      data: {
        content: result[options.formats[0]],
        format: options.formats[0],
        extractedData: result.extracted,
        screenshots: result.screenshots,
        html: result.html,
        metadata: {
          url,
          scraped_at: new Date().toISOString(),
          ...result.metadata
        }
      }
    }

    return response
  } catch (error) {
    logger.error('Firecrawl extract error:', error)
    return {
      error: 'Extract request failed',
      message: error.message
    }
  }
}

export default extract

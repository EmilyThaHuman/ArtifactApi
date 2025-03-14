import { firecrawl } from '../../config/firecrawl.js'
import logger from '../../utils/logger.js'

/**
 * Process multiple URLs to generate web document content
 * @param {string[]} urls - An array of URLs to process
 * @param {Object} options - Additional options for processing
 * @returns {Promise<Object>} The processed results
 */
export const generateWebDocuments = async (urls, options = {}) => {
  try {
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return {
        success: false,
        error: 'At least one URL is required'
      }
    }

    // Process each URL using scrapeUrl
    const results = await Promise.all(
      urls.map(async (url) => {
        try {
          // Use the standard scrapeUrl method with only valid formats
          const result = await firecrawl.scrapeUrl(url, {
            formats: ['markdown'], // Only use markdown format which is valid
            actions: [
              { type: 'wait', milliseconds: options.waitTime || 2000 },
              { type: 'scrape' }
            ]
          })

          if (!result.success) {
            return {
              url,
              success: false,
              error: `Failed to process: ${result.error || 'Unknown error'}`
            }
          }

          // Get page title from metadata or fallback to URL domain
          const pageTitle =
            result.metadata?.title || new URL(url).hostname.replace('www.', '')

          // Create a simple markdown formatted text for llmContent
          const llmContent = `# ${pageTitle}\n\nURL: [${url}](${url})\n\n## Summary\n\nThis is documentation for ${pageTitle}.`

          // Use the markdown content from scrape for fullContent
          const fullContent = result.markdown || ''

          return {
            url,
            success: true,
            llmContent,
            fullContent,
            processedUrls: [url],
            metadata: {
              url,
              title: pageTitle,
              description: result.metadata?.description || '',
              processed_at: new Date().toISOString(),
              status: 'completed'
            }
          }
        } catch (error) {
          logger.error(`Error processing URL ${url}:`, error)
          return {
            url,
            success: false,
            error: error.message || 'Failed to process URL'
          }
        }
      })
    )

    // Compile overall results
    const successfulResults = results.filter((result) => result.success)
    const failedResults = results.filter((result) => !result.success)

    return {
      success: true,
      totalProcessed: urls.length,
      successfulCount: successfulResults.length,
      failedCount: failedResults.length,
      results: successfulResults,
      errors: failedResults,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    logger.error('Web document processing error:', error)
    return {
      success: false,
      error: 'Document processing failed',
      message: error.message,
      timestamp: new Date().toISOString()
    }
  }
}

export default generateWebDocuments

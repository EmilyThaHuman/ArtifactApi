import { PlaywrightCrawler } from 'crawlee';

export class CrawlerController {
  
  async crawlSite(req, res) {
    try {
      const { url, maxRequests = 10, depth = 1 } = req.body;
      
      if (!url) {
        return res.status(400).json({ error: 'URL is required' });
      }
      
      // Results storage
      const results = {
        pages: [],
        stats: {
          requestsTotal: 0,
          crawlDuration: 0,
          startedAt: new Date().toISOString()
        }
      };
      
      // Configure crawler
      const crawler = new PlaywrightCrawler({
        maxRequestsPerCrawl: maxRequests,
        maxConcurrency: 2,
        requestHandlerTimeoutSecs: 60,
        navigationTimeoutSecs: 60,
        
        async requestHandler({ request, page, enqueueLinks }) {
          console.log(`Processing: ${request.url}`);
          
          // Only follow links up to specified depth
          if (request.userData.depth < depth) {
            await enqueueLinks({
              transformRequestFunction: (req) => {
                req.userData.depth = request.userData.depth + 1;
                return req;
              },
            });
          }
          
          // Extract page data
          const title = await page.title();
          const content = await page.evaluate(() => {
            const body = document.querySelector('body');
            return body ? body.innerText : '';
          });
          
          // Extract links
          const links = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a'))
              .map(link => ({
                url: link.href,
                text: link.innerText.trim(),
                title: link.title || null
              }))
              .filter(link => link.url && link.url.startsWith('http'));
          });
          
          // Add page to results
          results.pages.push({
            url: request.url,
            title,
            snippets: content ? content.substring(0, 500) + (content.length > 500 ? '...' : '') : '',
            contentLength: content ? content.length : 0,
            links: links.slice(0, 20), // Limit to 20 links per page
            depth: request.userData.depth,
            crawledAt: new Date().toISOString()
          });
        },
        
        // Handle failures
        failedRequestHandler({ request, error }) {
          console.error(`Error crawling ${request.url}: ${error.message}`);
          results.pages.push({
            url: request.url,
            error: error.message,
            depth: request.userData.depth,
            crawledAt: new Date().toISOString()
          });
        },
      });
      
      // Set starting point with depth 0
      await crawler.run([{
        url,
        userData: { depth: 0 }
      }]);
      
      // Update stats
      results.stats.requestsTotal = results.pages.length;
      results.stats.crawlDuration = (new Date() - new Date(results.stats.startedAt)) / 1000;
      results.stats.completedAt = new Date().toISOString();
      
      res.json(results);
    } catch (error) {
      console.error('Crawler error:', error);
      res.status(500).json({
        error: 'Failed to crawl site',
        details: error.message
      });
    }
  }
} 
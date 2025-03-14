import axios from 'axios';
import logger from '../../utils/logger.js';

const SERPER_BASE_URL = 'https://google.serper.dev';
const SERPER_API_KEY = process.env.SERPER_API_KEY || process.env.GOOGLE_SERPER_API_KEY;

/**
 * Search handler function
 */
export const handleSearch = async (req, res) => {
  try {
    const { query, options = {} } = req.body;

    // Validate user input
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({
        error: 'A valid "query" parameter is required.'
      });
    }

    // Configure Search & Images
    const searchConfig = {
      method: 'post',
      maxBodyLength: Infinity,
      url: `${SERPER_BASE_URL}/search`,
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json'
      },
      data: {
        q: query.trim(),
        num: options.maxResults || 15
      }
    };

    const imagesConfig = {
      method: 'post',
      maxBodyLength: Infinity,
      url: `${SERPER_BASE_URL}/images`,
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json'
      },
      data: {
        q: query.trim(),
        num: 10
      }
    };

    // Perform Search
    const searchResponse = await axios.request(searchConfig);
    const results = searchResponse.data.organic || [];

    // Scrape first 5 results
    const webPagesPromises = results.slice(0, 5).map(async (result) => {
      const webPagesConfig = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://scrape.serper.dev',
        headers: {
          'X-API-KEY': SERPER_API_KEY,
          'Content-Type': 'application/json'
        },
        data: JSON.stringify({
          url: result.link,
          includeMarkdown: true
        })
      };
      // Potentially wrap in try-catch if you want partial results
      const webPageResponse = await axios.request(webPagesConfig);
      return webPageResponse.data;
    });

    // Wait for all page scrapes to complete
    const webPages = await Promise.all(webPagesPromises);

    // Fetch Images
    const imagesResponse = await axios.request(imagesConfig);
    const images = imagesResponse.data?.images || [];

    // Format results
    const formattedResults = results.map((result) => ({
      title: formatTitle(result.title),
      description: formatDescription(result.snippet, query),
      url: result.link,
      metadata: {
        source: safeHostname(result.link),
        timestamp: new Date().toISOString(),
        relevanceScore: result.position,
        knowledgeGraph: result.knowledgeGraph || null,
        relatedSearches: searchResponse.data.relatedSearches || []
      }
    }));

    // Return combined data
    return res.json({
      results: formattedResults,
      webPages, // HTML or markdown from scraped pages
      images,
      metadata: {
        query,
        totalResults:
          searchResponse.data.searchInformation?.totalResults || null,
        searchTime:
          searchResponse.data.searchInformation?.searchTimeTaken || null,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Search API error:', error);
    return res.status(500).json({
      error: 'Search operation failed',
      details:
        process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * SearchV2 handler function
 */
export const handleSearchV2 = async (req, res) => {
  try {
    const { query, type } = req.body;
    logger.info('Query:', query);
    logger.info('Type:', type);

    // Parallel requests for web, image, and related searches
    const [webResults, imageResults] = await Promise.all([
      // Web search request
      axios.post(
        `${SERPER_BASE_URL}/search`,
        {
          q: query,
          num: 30
        },
        {
          headers: {
            'X-API-KEY': SERPER_API_KEY,
            'Content-Type': 'application/json'
          }
        }
      ),

      // Image search request
      axios.post(
        `${SERPER_BASE_URL}/images`,
        {
          q: query,
          num: 5
        },
        {
          headers: {
            'X-API-KEY': SERPER_API_KEY,
            'Content-Type': 'application/json'
          }
        }
      )
    ]);

    // Process and structure the response
    const structuredResponse = {
      webResults: webResults.data.organic.map((result) => ({
        title: result.title,
        link: result.link,
        snippet: result.snippet,
        position: result.position,
        favicon: `https://www.google.com/s2/favicons?domain=${new URL(result.link).hostname}`,
        domain: new URL(result.link).hostname
      })),

      imageResults: imageResults.data.images.map((image) => ({
        title: image.title,
        link: image.link,
        imageUrl: image.imageUrl,
        source: image.source
      })),

      relatedSearches: webResults.data.relatedSearches?.slice(0, 5) || [],

      metadata: {
        query: query,
        totalResults: webResults.data.searchParameters?.totalResults,
        searchTime: webResults.data.searchParameters?.timeElapsed,
        queryTime: new Date().toISOString()
      }
    };

    res.json(structuredResponse);
  } catch (error) {
    logger.error('Search API Error:', error);
    res.status(500).json({
      error: 'Failed to fetch search results',
      details: error.message
    });
  }
};

/**
 * Places search handler function
 */
export const handlePlacesSearch = async (req, res) => {
  try {
    const { q, location } = req.body;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        error: 'A valid "q" parameter is required for place search.'
      });
    }

    // Call Serper Places API
    const response = await fetch('https://google.serper.dev/places', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ q: q.trim(), location: location?.trim() || '' })
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error('Serper API error:', error);
      return res.status(response.status).json({
        error: 'Failed to fetch places data',
        details: error
      });
    }

    const data = await response.json();

    // Normalize and validate the response data
    const normalizedData = {
      places: (data.places || []).map((place) => ({
        position: place.position,
        title: place.title,
        address: place.address,
        latitude: place.latitude,
        longitude: place.longitude,
        rating: place.rating,
        ratingCount: place.ratingCount,
        category: place.category,
        phoneNumber: place.phoneNumber,
        website: place.website,
        cid: place.cid,
        // Additional cleanup or fallback
        imageUrl: place.thumbnailUrl || null,
        priceLevel: place.priceLevel || null,
        hours: place.hours || null
      })),
      metadata: {
        query: q.trim(),
        location: location?.trim() || null,
        timestamp: new Date().toISOString(),
        provider: 'serper',
        resultCount: data.places?.length || 0
      }
    };

    // Cache headers for performance
    // Public, 5 minutes caching
    res.set({
      'Cache-Control': 'public, max-age=300',
      Vary: 'Accept-Encoding'
    });

    return res.json(normalizedData);
  } catch (error) {
    logger.error('Places search error:', error);
    return res.status(500).json({
      error: 'Internal server error during places search',
      message: error.message
    });
  }
};

// Helper Functions
function formatTitle(title) {
  if (!title) return '';
  // Escape potential HTML
  return title.replace(/</g, '&lt;').replace(/>/g, '&gt;').trim();
}

function formatDescription(description, query) {
  if (!description) return '';
  // Escape HTML
  let formatted = description.replace(/</g, '&lt;').replace(/>/g, '&gt;').trim();
  // Highlight query terms of length > 2
  const keywords = query
    .toLowerCase()
    .split(' ')
    .filter((word) => word.length > 2);

  keywords.forEach((keyword) => {
    const regex = new RegExp(`(${keyword})`, 'gi');
    formatted = formatted.replace(regex, '<strong>$1</strong>');
  });
  return formatted;
}

function safeHostname(link) {
  try {
    return new URL(link).hostname;
  } catch (err) {
    return '';
  }
} 
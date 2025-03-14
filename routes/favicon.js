// routes/favicon.js
import axios from "axios";
import express from "express";
import NodeCache from "node-cache";

const router = express.Router();

// Cache favicons for 24 hours
const faviconCache = new NodeCache({ stdTTL: 86400 });

// Utility function to validate and clean domain
const cleanDomain = (domain) => {
  try {
    // Remove protocol, www, and any paths/query params
    return domain.replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0];
  } catch (error) {
    throw new Error("Invalid domain format");
  }
};

// Function to check if URL is accessible and returns an image
const checkImageUrl = async (url) => {
  try {
    const response = await axios.get(url, {
      timeout: 3000,
      responseType: "arraybuffer",
      validateStatus: (status) => status === 200,
    });

    const contentType = response.headers["content-type"];
    return contentType && contentType.startsWith("image/");
  } catch {
    return false;
  }
};

// Main favicon route handler
router.get("/", async (req, res) => {
  const { domain } = req.query;

  if (!domain) {
    return res.status(400).json({ error: "Domain parameter is required" });
  }

  try {
    // Clean and validate domain
    const cleanedDomain = cleanDomain(domain);

    // Check cache first
    const cachedUrl = faviconCache.get(cleanedDomain);
    if (cachedUrl) {
      return res.json({ url: cachedUrl });
    }

    // List of potential favicon sources to try
    const sources = [
      // Google's favicon service (most reliable)
      `https://www.google.com/s2/favicons?domain=${cleanedDomain}&sz=128`,
      // Common favicon locations
      `https://${cleanedDomain}/favicon.ico`,
      `https://${cleanedDomain}/favicon.png`,
      `https://${cleanedDomain}/apple-touch-icon.png`,
      `https://${cleanedDomain}/apple-touch-icon-precomposed.png`,
    ];

    // Try each source until we find a working one
    for (const url of sources) {
      const isValid = await checkImageUrl(url);
      if (isValid) {
        // Cache the successful URL
        faviconCache.set(cleanedDomain, url);
        return res.json({ url });
      }
    }

    // If no favicon found, try a fallback service
    const fallbackUrl = `https://icon.horse/icon/${cleanedDomain}`;
    const isFallbackValid = await checkImageUrl(fallbackUrl);

    if (isFallbackValid) {
      faviconCache.set(cleanedDomain, fallbackUrl);
      return res.json({ url: fallbackUrl });
    }

    // If all attempts fail, return error
    return res.status(404).json({ error: "No favicon found" });
  } catch (error) {
    console.error("Favicon fetch error:", error);
    return res.status(500).json({
      error: "Failed to fetch favicon",
      message: error.message,
    });
  }
});

// Cache cleaning endpoint (optional, for maintenance)
router.post("/api/favicon/clear-cache", (req, res) => {
  try {
    const { domain } = req.body;
    if (domain) {
      // Clear specific domain
      const cleanedDomain = cleanDomain(domain);
      faviconCache.del(cleanedDomain);
    } else {
      // Clear all cache
      faviconCache.flushAll();
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to clear cache" });
  }
});

// Health check endpoint
router.get("/api/favicon/health", (req, res) => {
  res.json({
    status: "healthy",
    cacheStats: faviconCache.getStats(),
  });
});

export default router;

// routes/index.js
import fs from "fs";
import path from "path";

import { Router } from "express";
import multer from "multer";
import swaggerUi from "swagger-ui-express";

import { apiLimiter } from "../middleware/rateLimiter.js";
import { specs } from "../utils/swagger.js";

import crawleeRoutes from "./crawlee/index.js";
// import faviconRoutes from "./favicon.js";
import firecrawlRoutes from "./firecrawl/index.js";
import serperRoutes from "./serper/index.js";
import toolsRoutes from "./tools/index.js";
import openaiRoutes from "./openai/index.js";

// Setup multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadsDir = path.join(__dirname, "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });
export const setupRoutes = (app) => {
  const apiRouter = Router();

  // API Documentation
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

  // Health check (no auth required)
  app.get("/health", (req, res) => {
    res.json({
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // API routes with common middleware
  app.use("/api", apiLimiter, apiRouter);

  apiRouter.use("/serper", serperRoutes);
  apiRouter.use("/firecrawl", firecrawlRoutes);
  apiRouter.use("/tools", toolsRoutes);
  // apiRouter.use("/favicon", faviconRoutes);
  apiRouter.use("/crawlee", crawleeRoutes);
  apiRouter.use("/openai", openaiRoutes);

  // Error handling for unmatched routes
  app.use("*", (req, res) => {
    res.status(404).json({ error: "Route not found" });
  });
};

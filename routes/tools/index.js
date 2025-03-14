import { Router } from 'express';

const router = Router();

/**
 * @swagger
 * /api/tools:
 *   get:
 *     summary: List available tools
 *     description: Returns a list of all available AI tools and utilities
 *     tags: [Tools]
 *     responses:
 *       200:
 *         description: List of tools
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tools:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       category:
 *                         type: string
 */
router.get('/', (req, res) => {
  const tools = [
    {
      id: 'text-search',
      name: 'Text Search',
      description: 'Search for information across indexed documents',
      category: 'search'
    },
    {
      id: 'image-recognition',
      name: 'Image Recognition',
      description: 'Analyze and extract information from images',
      category: 'vision'
    },
    {
      id: 'code-analysis',
      name: 'Code Analysis',
      description: 'Analyze and improve code quality',
      category: 'development'
    }
  ];
  
  res.json({ tools });
});

/**
 * @swagger
 * /api/tools/{toolId}:
 *   get:
 *     summary: Get tool details
 *     description: Get detailed information about a specific tool
 *     tags: [Tools]
 *     parameters:
 *       - in: path
 *         name: toolId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the tool to retrieve
 *     responses:
 *       200:
 *         description: Tool details
 *       404:
 *         description: Tool not found
 */
router.get('/:toolId', (req, res) => {
  const { toolId } = req.params;
  
  const toolMap = {
    'text-search': {
      id: 'text-search',
      name: 'Text Search',
      description: 'Search for information across indexed documents',
      category: 'search',
      apiEndpoint: '/api/tools/text-search',
      parameters: [
        { name: 'query', type: 'string', required: true, description: 'Search query' },
        { name: 'limit', type: 'number', required: false, description: 'Maximum results to return' }
      ]
    },
    'image-recognition': {
      id: 'image-recognition',
      name: 'Image Recognition',
      description: 'Analyze and extract information from images',
      category: 'vision',
      apiEndpoint: '/api/tools/image-recognition',
      parameters: [
        { name: 'image', type: 'file', required: true, description: 'Image to analyze' }
      ]
    },
    'code-analysis': {
      id: 'code-analysis',
      name: 'Code Analysis',
      description: 'Analyze and improve code quality',
      category: 'development',
      apiEndpoint: '/api/tools/code-analysis',
      parameters: [
        { name: 'code', type: 'string', required: true, description: 'Code to analyze' },
        { name: 'language', type: 'string', required: true, description: 'Programming language' }
      ]
    }
  };
  
  const tool = toolMap[toolId];
  
  if (!tool) {
    return res.status(404).json({ error: 'Tool not found' });
  }
  
  res.json(tool);
});

export default router; 
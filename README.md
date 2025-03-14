# Artifact API

A comprehensive Express.js backend service for AI applications, providing various API endpoints for AI-powered features.

## Features

- REST API endpoints for multiple AI services
- OpenAI integration for AI-powered features
- Web scraping and data extraction capabilities
- Rate limiting and security features
- Swagger API documentation
- Multiple third-party API integrations

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- API keys for integrated services (OpenAI, Serper, etc.)

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/artifact-api.git
   cd artifact-api
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file based on the `.env.example` template:
   ```
   cp .env.example .env
   ```

4. Update the `.env` file with your API keys and configuration settings.

## Usage

### Development

To run the server in development mode with hot reloading:

```
npm run dev
```

### Production

To run the server in production mode:

```
npm start
```

## API Documentation

Once the server is running, you can access the Swagger API documentation at:

```
http://localhost:3000/api-docs
```

## Project Structure

```
├── middleware/         # Express middleware
├── routes/             # API route handlers
│   ├── crawlee/        # Web crawling routes
│   ├── firecrawl/      # Firebase crawler routes
│   ├── openai/         # OpenAI integration routes
│   ├── serper/         # Google search API routes
│   └── ... other route modules
├── utils/              # Utility functions
├── .env                # Environment variables (create from .env.example)
├── .env.example        # Environment variables template
├── package.json        # Project dependencies
├── README.md           # Project documentation
└── server.js           # Main application entry point
```

## Deployment

### Render.com Deployment

1. Create a new Web Service on Render.com
2. Connect to your GitHub repository
3. Use the following settings:
   - Environment: Node
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Add your environment variables from .env

## License

MIT

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -am 'Add your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Create a new Pull Request # ArtifactApi

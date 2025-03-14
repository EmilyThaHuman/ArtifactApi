import dotenv from 'dotenv'
import Together from 'together-ai'

dotenv.config()

const options = {}
if (process.env.HELICONE_API_KEY) {
  options.baseURL = 'https://together.helicone.ai/v1'
  options.defaultHeaders = {
    'Helicone-Auth': `Bearer ${process.env.HELICONE_API_KEY}`
  }
}

export const together = new Together(options)

export default together

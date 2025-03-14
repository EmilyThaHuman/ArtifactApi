import dotenv from 'dotenv';

dotenv.config();

/**
 * Stripe price configuration
 * These are the price IDs for your subscription plans
 */
export const STRIPE_PRICES = {
  // Free tier ($0/month)
  FREE: process.env.STRIPE_PRICE_FREE,
  
  // Pro tier ($19.99/month)
  PRO: process.env.STRIPE_PRICE_PRO,
};

/**
 * Plan information including features and details
 * This can be used for displaying plan information on the frontend
 */
export const SUBSCRIPTION_PLANS = {
  FREE: {
    id: 'free',
    name: 'Free Plan',
    price: 0,
    priceId: STRIPE_PRICES.FREE,
    interval: 'month',
    currency: 'usd',
    features: [
      'Basic access',
      'Limited usage',
      'Standard support'
    ]
  },
  PRO: {
    id: 'pro',
    name: 'Pro Plan',
    price: 19.99,
    priceId: STRIPE_PRICES.PRO,
    interval: 'month',
    currency: 'usd',
    features: [
      'Full access to all features',
      'Unlimited usage',
      'Priority support',
      'Advanced analytics'
    ]
  }
};

export default STRIPE_PRICES; 
// routes/stripe/stripe.js
import dotenv from 'dotenv';
import Stripe from 'stripe';
import logger from '../../utils/logger.js';

dotenv.config();

// Initialize Stripe client with the API key from environment variables
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Default domain for return URLs
const DEFAULT_DOMAIN = process.env.API_URL || 'http://localhost:3000';

/**
 * Create a checkout session for payment processing
 * @param {Object} options - Checkout options
 * @param {Array} options.lineItems - Line items for the checkout
 * @param {string} options.mode - Payment mode ('payment', 'subscription', etc.)
 * @param {string} options.successUrl - URL to redirect after successful payment
 * @param {string} options.cancelUrl - URL to redirect after canceled payment
 * @param {string} options.returnUrl - Return URL for embedded checkout
 * @param {boolean} options.embedded - Whether to use embedded checkout
 * @returns {Promise<Object>} Checkout session details
 */
export const createCheckoutSession = async (options = {}) => {
  try {
    const {
      lineItems = [],
      mode = 'payment',
      successUrl,
      cancelUrl,
      returnUrl,
      embedded = false,
      customerEmail
    } = options;

    const sessionConfig = {
      line_items: lineItems,
      mode: mode,
    };

    // Configure redirect or embedded UI mode
    if (embedded) {
      sessionConfig.ui_mode = 'embedded';
      sessionConfig.return_url = returnUrl || `${DEFAULT_DOMAIN}/return?session_id={CHECKOUT_SESSION_ID}`;
    } else {
      sessionConfig.success_url = successUrl || `${DEFAULT_DOMAIN}/success?session_id={CHECKOUT_SESSION_ID}`;
      sessionConfig.cancel_url = cancelUrl || `${DEFAULT_DOMAIN}/cancel`;
    }

    // Add customer email if provided
    if (customerEmail) {
      sessionConfig.customer_email = customerEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);
    
    return embedded 
      ? { clientSecret: session.client_secret }
      : { sessionId: session.id, url: session.url };
      
  } catch (error) {
    logger.error('Error creating checkout session:', { error: error.message });
    throw error;
  }
};

/**
 * Retrieve a checkout session by ID
 * @param {string} sessionId - The ID of the checkout session to retrieve
 * @returns {Promise<Object>} Session details
 */
export const getSessionStatus = async (sessionId) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return {
      status: session.status,
      customer_email: session.customer_details?.email,
      payment_status: session.payment_status,
      amount_total: session.amount_total,
      currency: session.currency
    };
  } catch (error) {
    logger.error('Error retrieving session status:', { error: error.message, sessionId });
    throw error;
  }
};

/**
 * Create a payment intent
 * @param {Object} options - Payment intent options
 * @returns {Promise<Object>} Payment intent details
 */
export const createPaymentIntent = async (options = {}) => {
  try {
    const {
      amount,
      currency = 'usd',
      paymentMethodTypes = ['card'],
      description,
      metadata
    } = options;

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      payment_method_types: paymentMethodTypes,
      description,
      metadata
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    };
  } catch (error) {
    logger.error('Error creating payment intent:', { error: error.message });
    throw error;
  }
};

/**
 * Handle Stripe webhook events
 * @param {string} signature - Stripe signature from request header
 * @param {Object} rawBody - Raw request body
 * @returns {Promise<Object>} Webhook event
 */
export const handleWebhookEvent = async (signature, rawBody) => {
  try {
    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    
    return event;
  } catch (error) {
    logger.error('Error processing webhook:', { error: error.message });
    throw error;
  }
};

import { Router } from 'express';
import { 
  createCheckoutSession, 
  getSessionStatus, 
  createPaymentIntent,
  handleWebhookEvent
} from './stripe.js';
import logger from '../../utils/logger.js';

const router = Router();

/**
 * @swagger
 * /api/stripe/checkout:
 *   post:
 *     summary: Create a Stripe checkout session
 *     tags: [Stripe]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               lineItems:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     price:
 *                       type: string
 *                     quantity:
 *                       type: number
 *               mode:
 *                 type: string
 *                 enum: [payment, subscription, setup]
 *               embedded:
 *                 type: boolean
 *               successUrl:
 *                 type: string
 *               cancelUrl:
 *                 type: string
 *               returnUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Checkout session created successfully
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Server error
 */
router.post('/checkout', async (req, res) => {
  try {
    const { 
      lineItems, 
      mode, 
      successUrl, 
      cancelUrl, 
      returnUrl, 
      embedded,
      customerEmail 
    } = req.body;

    // Validate required parameters
    if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      return res.status(400).json({ 
        error: 'Line items are required and must be a non-empty array' 
      });
    }

    const session = await createCheckoutSession({
      lineItems,
      mode,
      successUrl,
      cancelUrl,
      returnUrl,
      embedded,
      customerEmail
    });

    res.json(session);
  } catch (error) {
    logger.error('Checkout session creation failed:', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/stripe/session-status:
 *   get:
 *     summary: Get Stripe session status
 *     tags: [Stripe]
 *     parameters:
 *       - in: query
 *         name: session_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session status retrieved successfully
 *       400:
 *         description: Missing session ID
 *       500:
 *         description: Server error
 */
router.get('/session-status', async (req, res) => {
  try {
    const { session_id } = req.query;
    
    if (!session_id) {
      return res.status(400).json({ error: 'Session ID is required' });
    }
    
    const session = await getSessionStatus(session_id);
    res.json(session);
  } catch (error) {
    logger.error('Session status retrieval failed:', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/stripe/payment-intent:
 *   post:
 *     summary: Create a Stripe payment intent
 *     tags: [Stripe]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: integer
 *                 description: Amount in smallest currency unit (e.g., cents)
 *               currency:
 *                 type: string
 *                 default: usd
 *               description:
 *                 type: string
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Payment intent created successfully
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Server error
 */
router.post('/payment-intent', async (req, res) => {
  try {
    const { amount, currency, description, metadata } = req.body;
    
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ 
        error: 'Amount is required and must be a positive number' 
      });
    }
    
    const paymentIntent = await createPaymentIntent({
      amount,
      currency,
      description,
      metadata
    });
    
    res.json(paymentIntent);
  } catch (error) {
    logger.error('Payment intent creation failed:', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/stripe/webhook:
 *   post:
 *     summary: Handle Stripe webhooks
 *     tags: [Stripe]
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       400:
 *         description: Invalid webhook signature
 *       500:
 *         description: Server error
 */
router.post('/webhook', async (req, res) => {
  try {
    // Get the signature from the Stripe-Signature header
    const signature = req.headers['stripe-signature'];
    
    if (!signature) {
      return res.status(400).json({ error: 'Stripe signature header is missing' });
    }
    
    // Access the raw body of the request
    const event = await handleWebhookEvent(signature, req.rawBody);
    
    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        // Payment is successful
        logger.info('Checkout completed:', { 
          eventId: event.id,
          customerId: event.data.object.customer 
        });
        break;
        
      case 'payment_intent.succeeded':
        logger.info('Payment succeeded:', { 
          eventId: event.id,
          paymentIntentId: event.data.object.id 
        });
        break;
        
      // Handle other event types as needed
      default:
        logger.info(`Unhandled event type: ${event.type}`);
    }
    
    // Return a success response to acknowledge receipt of the event
    res.json({ received: true });
  } catch (error) {
    logger.error('Webhook processing failed:', { error: error.message });
    res.status(400).json({ error: error.message });
  }
});

export default router;

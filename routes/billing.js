const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');
const { authenticateToken } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Billing
 *   description: Subscription and billing management via Stripe
 */

// Public route for Stripe Webhooks (Stripe requires raw bytes for signature validation)
router.post('/webhook', express.raw({ type: 'application/json' }), billingController.handleWebhook);

// Protected routes
router.use(authenticateToken);

/**
 * @swagger
 * /billing/plan:
 *   get:
 *     summary: Get active subscription plan details and limits
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: teamId
 *         required: true
 *         schema:
 *           type: string
 *         description: Team ID
 *     responses:
 *       200:
 *         description: Plan and Limits retrieved successfully
 */
router.get('/plan', billingController.getPlan);

/**
 * @swagger
 * /billing/checkout:
 *   post:
 *     summary: Generate a Stripe checkout session URL
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               teamId:
 *                 type: string
 *               priceId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Checkout URL generated successfully
 */
router.post('/checkout', billingController.createCheckout);

router.get('/client-invoices', billingController.getClientInvoices);
router.post('/client-invoices', billingController.generateClientInvoice);

module.exports = router;

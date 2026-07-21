const prisma = require('../config/prisma');
const { successResponse, errorResponse } = require('../utils/response');

class IntegrationsController {
  static async getConnectedPlatforms(req, res) {
    try {
      const teamId = req.query.teamId;
      if (!teamId) return errorResponse(res, 'teamId is required', 400);

      const accounts = await prisma.connected_accounts.findMany({
        where: { account_id: teamId }, // Using account_id to store team association for e-commerce
      });

      successResponse(res, accounts, 'Integrations retrieved successfully');
    } catch (error) {
      console.error('Get Integrations Error:', error);
      errorResponse(res, 'Failed to fetch integrations');
    }
  }

  static async connectShopify(req, res) {
    try {
      const { teamId, shopUrl } = req.body;
      if (!teamId || !shopUrl) return errorResponse(res, 'teamId and shopUrl required', 400);

      // In a real app, this would redirect to Shopify OAuth
      // For this phase, we'll simulate an immediate successful connection
      const connection = await prisma.connected_accounts.create({
        data: {
          token_id: 1, // Dummy token
          account_id: teamId,
          account_name: shopUrl,
          platform: 'shopify',
          status: 'connected',
          is_active: true
        }
      });

      // Simulate a sync of historical revenue data
      await prisma.analytics.create({
        data: {
          user_id: req.user.id,
          platform: 'shopify',
          metric: 'true_revenue',
          value: 12500.00,
          date: new Date()
        }
      });

      successResponse(res, connection, 'Shopify connected successfully');
    } catch (error) {
      console.error('Connect Shopify Error:', error);
      errorResponse(res, 'Failed to connect Shopify');
    }
  }

  static async connectStripe(req, res) {
    try {
      const { teamId, apiKey } = req.body;
      if (!teamId || !apiKey) return errorResponse(res, 'teamId and apiKey required', 400);

      // Simulate an immediate successful connection
      const connection = await prisma.connected_accounts.create({
        data: {
          token_id: 1, // Dummy token
          account_id: teamId,
          account_name: 'Stripe Account',
          platform: 'stripe',
          status: 'connected',
          is_active: true
        }
      });

      // Simulate a sync of historical revenue data
      await prisma.analytics.create({
        data: {
          user_id: req.user.id,
          platform: 'stripe',
          metric: 'true_revenue',
          value: 24300.00,
          date: new Date()
        }
      });

      successResponse(res, connection, 'Stripe connected successfully');
    } catch (error) {
      console.error('Connect Stripe Error:', error);
      errorResponse(res, 'Failed to connect Stripe');
    }
  }
}

module.exports = IntegrationsController;

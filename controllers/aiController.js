const aiService = require('../services/aiService');
const { successResponse, errorResponse } = require('../utils/response');

class AIController {
    /**
     * POST /api/ai/generate-copy
     * Body: { topic: string, targetAudience: string, platform: string, provider: 'openai'|'anthropic'|'gemini' }
     */
    static async generateCopy(req, res) {
        try {
            const { topic, targetAudience, platform, provider } = req.body;

            if (!topic || !targetAudience) {
                return errorResponse(res, 'Topic and Target Audience are required', 400);
            }

            const activeProvider = provider || 'openai';
            const result = await aiService.generateAdCopy(topic, targetAudience, platform || 'Facebook', activeProvider);

            if (!result.success) {
                return errorResponse(res, result.error, 500);
            }

            successResponse(res, result.data, `Ad copy generated successfully using ${activeProvider}`);
        } catch (error) {
            console.error('AI Copy Generation Error:', error);
            errorResponse(res, error.message || 'Failed to generate ad copy', 500);
        }
    }

    /**
     * POST /api/ai/insights
     * Body: { metricsSummary: object, provider: 'openai'|'anthropic'|'gemini' }
     */
    static async generateInsights(req, res) {
        try {
            const { metricsSummary, provider } = req.body;
            const activeProvider = provider || 'openai';

            // Extract context from request to mirror legacy method signature
            const userId = req.user ? req.user.id : null;
            const propertyId = req.query.propertyId || 'global';

            const result = await aiService.getInsights(userId, propertyId, null, null, metricsSummary, activeProvider);

            if (!result.success) {
                return errorResponse(res, result.error, 500);
            }

            successResponse(res, result.data, `Insights generated successfully using ${activeProvider}`);
        } catch (error) {
            console.error('AI Insights Generation Error:', error);
            errorResponse(res, error.message || 'Failed to analyze insights', 500);
        }
    }
}

module.exports = AIController;

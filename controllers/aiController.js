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
    static async getInsightsOverview(req, res) {
        try {
            const userId = req.user.id;

            // Compute global ROAS heuristically
            const [rows] = await require('../config/database').pool.execute(`
                SELECT 
                    SUM(i.spend) as total_spend,
                    SUM(i.revenue) as total_revenue
                FROM ads_insights i
                JOIN ads_campaigns c ON i.campaign_id = c.id
                JOIN connected_accounts ca ON c.account_id = ca.id
                JOIN ads_tokens at ON ca.token_id = at.id
                WHERE at.user_id = ?
            `, [userId]);

            const spend = rows[0]?.total_spend || 0;
            const revenue = rows[0]?.total_revenue || 0;
            const roas = spend > 0 ? (revenue / spend) : 0;

            const structuredData = {
                insights: [
                    {
                        type: 'opportunity',
                        priority: 'high',
                        title: 'Increase Search budget by 20%',
                        description: `Your Search campaigns have a ${roas.toFixed(1)}x ROAS with room to scale.`,
                        metric: '+$' + ((revenue * 0.2) || 12000).toLocaleString() + ' estimated revenue',
                        icon: 'DollarSign',
                        color: 'text-green-500 bg-green-500/10',
                    },
                    {
                        type: 'warning',
                        priority: 'high',
                        title: 'Instagram engagement dropping',
                        description: 'Engagement rate has decreased 18% over the past 2 weeks.',
                        metric: '-18% engagement',
                        icon: 'AlertTriangle',
                        color: 'text-orange-500 bg-orange-500/10',
                    }
                ],
                weeklyDigest: {
                    totalSpend: '$' + parseFloat(spend).toLocaleString(),
                    totalRevenue: '$' + parseFloat(revenue).toLocaleString(),
                    roas: roas.toFixed(2) + 'x',
                    topChannel: 'Google Search',
                    topContent: 'How to Scale Ads',
                    score: spend > 0 ? 82 : 0,
                }
            };

            successResponse(res, structuredData, 'AI Insights overview retrieved');
        } catch (error) {
            console.error('AI Insights Overview Error:', error);
            errorResponse(res, 'Failed to retrieve AI insights overview');
        }
    }
}

module.exports = AIController;

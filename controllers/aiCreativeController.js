const prisma = require('../config/prisma');
const { successResponse, errorResponse } = require('../utils/response');

exports.getCreatives = async (req, res) => {
    try {
        const teamId = req.query.teamId;
        if (!teamId) return errorResponse(res, 'teamId required', 400);

        const creatives = await prisma.ai_creatives.findMany({
            where: { team_id: teamId },
            orderBy: { created_at: 'desc' }
        });
        successResponse(res, creatives, 'Creatives retrieved');
    } catch (error) {
        errorResponse(res, 'Failed to retrieve creatives');
    }
};

exports.generateCreative = async (req, res) => {
    try {
        const { teamId, prompt } = req.body;
        if (!teamId || !prompt) return errorResponse(res, 'teamId and prompt required', 400);

        // Simulate AI generation (DALL-E 3 / Midjourney mock)
        const mockImageUrl = `https://picsum.photos/seed/${Math.random().toString(36).substring(7)}/800/800`;
        const mockAdCopy = `Stop scrolling! Discover how ${prompt} can transform your life today. Click to learn more.`;

        const creative = await prisma.ai_creatives.create({
            data: {
                team_id: teamId,
                prompt,
                image_url: mockImageUrl,
                ad_copy: mockAdCopy,
                status: 'generated'
            }
        });

        successResponse(res, creative, 'Creative generated successfully');
    } catch (error) {
        errorResponse(res, 'Failed to generate creative');
    }
};

const CreativeIntelligenceService = require('../services/creativeIntelligenceService');

exports.getLeaderboard = async (req, res) => {
    try {
        const teamId = req.query.teamId;
        const leaderboard = await CreativeIntelligenceService.getCreativeLeaderboard(teamId, req.query);
        successResponse(res, leaderboard, 'Creative intelligence leaderboard retrieved');
    } catch (error) {
        console.error('getLeaderboard error:', error);
        errorResponse(res, 'Failed to retrieve creative leaderboard');
    }
};

exports.diagnoseCreative = async (req, res) => {
    try {
        const creative = req.body.creative;
        if (!creative) return errorResponse(res, 'creative data required', 400);

        const diagnosis = await CreativeIntelligenceService.diagnoseCreative(creative);
        successResponse(res, diagnosis, 'Creative diagnosed successfully');
    } catch (error) {
        console.error('diagnoseCreative error:', error);
        errorResponse(res, 'Failed to diagnose creative');
    }
};

const FatigueAlertService = require('../services/fatigueAlertService');

/**
 * Get fatigue alert settings for team
 * GET /api/ai-creative/alerts/settings
 */
exports.getAlertSettings = async (req, res) => {
    try {
        const teamId = req.query.teamId || 'default_team';
        const settings = FatigueAlertService.getSettings(teamId);
        successResponse(res, settings, 'Alert settings retrieved');
    } catch (error) {
        console.error('getAlertSettings error:', error);
        errorResponse(res, 'Failed to get alert settings');
    }
};

/**
 * Update fatigue alert settings
 * PUT /api/ai-creative/alerts/settings
 */
exports.updateAlertSettings = async (req, res) => {
    try {
        const teamId = req.body.teamId || 'default_team';
        const settings = FatigueAlertService.updateSettings(teamId, req.body);
        successResponse(res, settings, 'Alert settings updated successfully');
    } catch (error) {
        console.error('updateAlertSettings error:', error);
        errorResponse(res, 'Failed to update alert settings');
    }
};

/**
 * Test Slack or Webhook connection
 * POST /api/ai-creative/alerts/test
 */
exports.testAlert = async (req, res) => {
    try {
        const { channel, webhookUrl, teamName } = req.body;
        const result = await FatigueAlertService.testAlert({
            channel,
            webhookUrl,
            teamName
        });
        successResponse(res, result, result.message);
    } catch (error) {
        console.error('testAlert error:', error);
        errorResponse(res, error.message || 'Failed to dispatch test alert', 400);
    }
};

/**
 * Scan active creatives and dispatch alerts to Slack / Webhooks
 * POST /api/ai-creative/alerts/scan
 */
exports.scanAndDispatchAlerts = async (req, res) => {
    try {
        const teamId = req.body.teamId || req.query.teamId || 'default_team';
        const results = await FatigueAlertService.scanAndDispatch(teamId);
        successResponse(res, results, `Scanned ${results.scannedCount} creatives. Found ${results.fatiguedCount} fatigued assets.`);
    } catch (error) {
        console.error('scanAndDispatchAlerts error:', error);
        errorResponse(res, 'Failed to scan and dispatch alerts');
    }
};

/**
 * Dispatch an instant Slack alert for a specific creative card
 * POST /api/ai-creative/alerts/dispatch-single
 */
exports.dispatchSingleAlert = async (req, res) => {
    try {
        const { creative, teamId = 'default_team', channel = 'slack' } = req.body;
        if (!creative) return errorResponse(res, 'creative data required', 400);

        const config = FatigueAlertService.getSettings(teamId);
        const webhookUrl = channel === 'slack' ? config.slack_webhook_url : config.custom_webhook_url;

        if (!webhookUrl) {
            return errorResponse(res, `No ${channel} webhook URL configured. Please configure in Alert Settings.`, 400);
        }

        if (channel === 'slack') {
            const payload = FatigueAlertService.buildSlackBlockKit(creative);
            await FatigueAlertService.sendSlack(webhookUrl, payload);
        } else {
            await FatigueAlertService.sendCustomWebhook(webhookUrl, { creative, teamId });
        }

        successResponse(res, { dispatched: true }, `Fatigue alert for "${creative.adName}" sent to ${channel}!`);
    } catch (error) {
        console.error('dispatchSingleAlert error:', error);
        errorResponse(res, error.message || 'Failed to dispatch alert', 500);
    }
};


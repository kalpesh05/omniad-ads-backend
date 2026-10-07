const { successResponse, errorResponse } = require('../utils/response');
const CompetitorSpyService = require('../services/competitorSpyService');

/**
 * Search active competitor ads across Meta, TikTok, YouTube
 * GET /api/spy/search
 */
exports.searchCompetitors = async (req, res) => {
    try {
        const { query, niche, platform, onlyScalers } = req.query;
        const result = CompetitorSpyService.searchCompetitors({
            query,
            niche,
            platform,
            onlyScalers: onlyScalers === 'true' || onlyScalers === true
        });

        return successResponse(res, result, 'Competitor ad intelligence retrieved successfully');
    } catch (error) {
        console.error('[SpyController] searchCompetitors error:', error);
        return errorResponse(res, error.message || 'Failed to search competitor ads', 500);
    }
};

/**
 * Reverse-engineer the anatomical psychology of a competitor ad
 * POST /api/spy/reverse-engineer
 */
exports.reverseEngineerAngle = async (req, res) => {
    try {
        const { adId } = req.body;
        if (!adId) {
            return errorResponse(res, 'adId is required', 400);
        }

        const breakdown = CompetitorSpyService.reverseEngineerAd(adId);
        return successResponse(res, breakdown, 'Competitor angle successfully reverse-engineered');
    } catch (error) {
        console.error('[SpyController] reverseEngineerAngle error:', error);
        return errorResponse(res, error.message || 'Failed to reverse engineer competitor angle', 500);
    }
};

/**
 * 1-Click AI Clone: Re-engineer competitor angle into 3 customized hooks for user's brand
 * POST /api/spy/clone
 */
exports.cloneAngle = async (req, res) => {
    try {
        const { adId, brandName, productType, targetAudience, valueProp } = req.body;
        if (!adId) {
            return errorResponse(res, 'adId is required', 400);
        }

        const clonedScripts = CompetitorSpyService.cloneAngle(adId, {
            brandName,
            productType,
            targetAudience,
            valueProp
        });

        return successResponse(res, clonedScripts, 'Competitor angle successfully cloned and customized');
    } catch (error) {
        console.error('[SpyController] cloneAngle error:', error);
        return errorResponse(res, error.message || 'Failed to clone competitor angle', 500);
    }
};

/**
 * Legacy endpoint support
 * POST /api/spy/analyze
 */
exports.analyzeCompetitor = async (req, res) => {
    try {
        const { domain } = req.body;
        if (!domain) return errorResponse(res, 'domain required', 400);

        const result = CompetitorSpyService.searchCompetitors({ query: domain });
        const topAd = result.ads[0] || null;

        const legacyData = {
            domain: domain,
            estimated_spend_monthly: topAd ? topAd.estimated_daily_spend : '$45,000 / mo',
            top_platforms: topAd ? topAd.platforms : ['Meta Ads', 'TikTok'],
            angles: [
                'Social Proof & Authority Endorsement',
                'The Contrarian Anti-Status-Quo Hook',
                'Visual Transformation & Feature Contrast'
            ],
            creatives: result.ads.map(ad => ({
                id: ad.id,
                type: ad.media_type.toLowerCase(),
                url: ad.thumbnail_url,
                copy: ad.primary_text
            }))
        };

        return successResponse(res, legacyData, 'Competitor intelligence retrieved successfully');
    } catch (error) {
        console.error('[SpyController] analyzeCompetitor error:', error);
        return errorResponse(res, 'Failed to analyze competitor', 500);
    }
};

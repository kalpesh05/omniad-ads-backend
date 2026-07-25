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

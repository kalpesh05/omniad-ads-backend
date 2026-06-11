const prisma = require('../config/prisma');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const uuid = require('uuid');

exports.getBrandGuidelines = asyncHandler(async (req, res) => {
    const { teamId } = req.params;

    if (!teamId) {
        throw new AppError('teamId parameter is required', 400, 'VALIDATION_ERROR');
    }

    const guidelines = await prisma.brand_guidelines.findUnique({
        where: { team_id: teamId }
    });

    if (!guidelines) {
        // Return default empty structure instead of failing
        return res.status(200).json({
            success: true,
            data: {
                brand_name: '',
                brand_voice: '',
                faq_rules: '[]'
            }
        });
    }

    res.status(200).json({
        success: true,
        data: guidelines
    });
});

exports.updateBrandGuidelines = asyncHandler(async (req, res) => {
    const { teamId } = req.params;
    const { brandName, brandVoice, faqRules } = req.body;

    if (!teamId) {
        throw new AppError('teamId parameter is required', 400, 'VALIDATION_ERROR');
    }

    if (!brandName || !brandVoice) {
        throw new AppError('brandName and brandVoice are required fields', 400, 'VALIDATION_ERROR');
    }

    // Ensure faqRules is a string (JSON representation)
    const faqRulesString = typeof faqRules === 'string' 
        ? faqRules 
        : JSON.stringify(faqRules || []);

    // Check if it already exists
    const existing = await prisma.brand_guidelines.findUnique({
        where: { team_id: teamId }
    });

    let result;

    if (existing) {
        result = await prisma.brand_guidelines.update({
            where: { team_id: teamId },
            data: {
                brand_name: brandName,
                brand_voice: brandVoice,
                faq_rules: faqRulesString,
                updated_at: new Date()
            }
        });
    } else {
        result = await prisma.brand_guidelines.create({
            data: {
                id: uuid.v4(),
                team_id: teamId,
                brand_name: brandName,
                brand_voice: brandVoice,
                faq_rules: faqRulesString
            }
        });
    }

    res.status(200).json({
        success: true,
        data: result
    });
});

const prisma = require('../config/prisma');
const { successResponse, errorResponse } = require('../utils/response');
const crypto = require('crypto');

exports.generateMagicLink = async (req, res) => {
    try {
        const { teamId, clientName, clientEmail } = req.body;
        if (!teamId || !clientName || !clientEmail) {
            return errorResponse(res, 'Missing required fields', 400);
        }

        const token = crypto.randomBytes(32).toString('hex');

        const portal = await prisma.client_portals.create({
            data: {
                team_id: teamId,
                client_name: clientName,
                client_email: clientEmail,
                magic_link_token: token,
                status: 'pending'
            }
        });

        // In production, we would send an email here using SendGrid or Resend.
        // For now, we just return the link so the agency can copy it.
        const magicLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/onboarding/${token}`;

        successResponse(res, { portal, magicLink }, 'Magic link generated successfully');
    } catch (error) {
        console.error('Error generating magic link:', error);
        errorResponse(res, 'Failed to generate magic link');
    }
};

exports.getPortals = async (req, res) => {
    try {
        const teamId = req.query.teamId;
        if (!teamId) return errorResponse(res, 'teamId required', 400);

        const portals = await prisma.client_portals.findMany({
            where: { team_id: teamId },
            orderBy: { created_at: 'desc' }
        });
        successResponse(res, portals, 'Portals retrieved');
    } catch (error) {
        errorResponse(res, 'Failed to retrieve portals');
    }
};

exports.verifyPortalToken = async (req, res) => {
    try {
        const { token } = req.params;
        const portal = await prisma.client_portals.findUnique({
            where: { magic_link_token: token },
            include: {
                teams: {
                    select: {
                        name: true,
                        settings: true
                    }
                }
            }
        });

        if (!portal) return errorResponse(res, 'Invalid or expired magic link', 404);

        successResponse(res, portal, 'Portal verified');
    } catch (error) {
        errorResponse(res, 'Failed to verify portal token');
    }
};

exports.completeOnboarding = async (req, res) => {
    try {
        const { token } = req.params;
        const portal = await prisma.client_portals.update({
            where: { magic_link_token: token },
            data: {
                status: 'completed',
                completed_at: new Date()
            }
        });
        successResponse(res, portal, 'Onboarding completed successfully');
    } catch (error) {
        errorResponse(res, 'Failed to complete onboarding');
    }
};

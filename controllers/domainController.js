const prisma = require('../config/prisma');
const { successResponse, errorResponse } = require('../utils/response');

class DomainController {
    static async getDomains(req, res) {
        try {
            const teamId = req.query.teamId;
            if (!teamId) {
                return errorResponse(res, 'teamId is required', 400);
            }

            const domains = await prisma.custom_domains.findMany({
                where: { team_id: teamId }
            });

            successResponse(res, { domains }, 'Domains retrieved successfully');
        } catch (error) {
            console.error('Get Domains Error:', error);
            errorResponse(res, 'Failed to retrieve custom domains');
        }
    }

    static async addDomain(req, res) {
        try {
            const { teamId, domain } = req.body;
            if (!teamId || !domain) {
                return errorResponse(res, 'teamId and domain are required', 400);
            }

            // Check if domain exists globally
            const existing = await prisma.custom_domains.findUnique({
                where: { domain }
            });

            if (existing) {
                return errorResponse(res, 'Domain is already registered by another team', 409);
            }

            const newDomain = await prisma.custom_domains.create({
                data: {
                    team_id: teamId,
                    domain,
                    status: 'pending' // pending DNS verification
                }
            });

            successResponse(res, { domain: newDomain }, 'Domain added successfully. Please configure your DNS settings.', 201);
        } catch (error) {
            console.error('Add Domain Error:', error);
            errorResponse(res, 'Failed to add custom domain');
        }
    }

    static async verifyDomain(req, res) {
        try {
            const { id } = req.params;
            const teamId = req.body.teamId;

            const domainRecord = await prisma.custom_domains.findUnique({
                where: { id }
            });

            if (!domainRecord) {
                return errorResponse(res, 'Domain not found', 404);
            }

            if (domainRecord.team_id !== teamId) {
                return errorResponse(res, 'Unauthorized access to domain', 403);
            }

            // Mock DNS Verification step
            // In reality, this would query DNS records (e.g. CNAME) for the domain.
            
            const updated = await prisma.custom_domains.update({
                where: { id },
                data: { status: 'active' }
            });

            successResponse(res, { domain: updated }, 'Domain verified successfully!');
        } catch (error) {
            console.error('Verify Domain Error:', error);
            errorResponse(res, 'Failed to verify custom domain');
        }
    }

    static async deleteDomain(req, res) {
        try {
            const { id } = req.params;
            const teamId = req.query.teamId;

            const domainRecord = await prisma.custom_domains.findUnique({
                where: { id }
            });

            if (!domainRecord) {
                return errorResponse(res, 'Domain not found', 404);
            }

            if (domainRecord.team_id !== teamId) {
                return errorResponse(res, 'Unauthorized access to domain', 403);
            }

            await prisma.custom_domains.delete({
                where: { id }
            });

            successResponse(res, null, 'Domain deleted successfully');
        } catch (error) {
            console.error('Delete Domain Error:', error);
            errorResponse(res, 'Failed to delete custom domain');
        }
    }
}

module.exports = DomainController;

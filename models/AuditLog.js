const prisma = require('../config/prisma');
const { v4: uuidv4 } = require('uuid');

class AuditLog {
    /**
     * Log an action (usually called internally by other controllers)
     */
    static async logAction(req, teamId, action, resource, resourceId, resourceName, details = {}) {
        try {
            const id = uuidv4();
            const userId = req.user ? req.user.id : null;
            const ipAddress = req.ip || req.connection.remoteAddress || null;
            const userAgent = req.headers ? req.headers['user-agent'] : null;

            await prisma.audit_logs.create({
                data: {
                    id,
                    team_id: teamId,
                    user_id: userId,
                    action,
                    resource,
                    resource_id: resourceId,
                    resource_name: resourceName,
                    details: JSON.stringify(details),
                    ip_address: ipAddress,
                    user_agent: userAgent
                }
            });

            return true;
        } catch (error) {
            console.error('Failed to write audit log:', error);
            // Suppress error so it doesn't break main flow, but log it to console
            return false;
        }
    }

    /**
     * Retrieve audit logs for a team with pagination
     */
    static async getLogs(teamId, options = {}) {
        const {
            page = 1,
            limit = 50,
            userId,
            action,
            resource,
            startDate,
            endDate
        } = options;

        const offset = (page - 1) * limit;

        const where = {
            team_id: teamId
        };

        if (userId) {
            where.user_id = parseInt(userId);
        }

        if (action) {
            where.action = action;
        }

        if (resource) {
            where.resource = resource;
        }

        if (startDate || endDate) {
            where.created_at = {};
            if (startDate) {
                where.created_at.gte = new Date(startDate);
            }
            if (endDate) {
                where.created_at.lte = new Date(endDate);
            }
        }

        const [total, logs] = await Promise.all([
            prisma.audit_logs.count({ where }),
            prisma.audit_logs.findMany({
                where,
                include: {
                    users: {
                        select: {
                            username: true,
                            email: true
                        }
                    }
                },
                orderBy: {
                    created_at: 'desc'
                },
                take: parseInt(limit),
                skip: parseInt(offset)
            })
        ]);

        // Map logs to return user_name and user_email format
        const mappedLogs = logs.map(log => ({
            ...log,
            user_name: log.users ? log.users.username : null,
            user_email: log.users ? log.users.email : null,
            users: undefined // remove relation object
        }));

        return {
            data: mappedLogs,
            meta: {
                page: parseInt(page),
                limit: parseInt(limit),
                total
            }
        };
    }
}

module.exports = AuditLog;

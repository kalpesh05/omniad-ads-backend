const prisma = require('../config/prisma');

class InboxMessage {
    /**
     * Fetch inbox messages for a team
     */
    static async getMessages(teamId, options = {}) {
        const {
            page = 1,
            limit = 20,
            platform,
            status
        } = options;

        const offset = (page - 1) * limit;

        const where = {
            team_id: teamId
        };

        if (platform) {
            where.platform = platform;
        }

        if (status) {
            where.status = status;
        }

        const [total, messages] = await Promise.all([
            prisma.inbox_messages.count({ where }),
            prisma.inbox_messages.findMany({
                where,
                orderBy: {
                    received_at: 'desc'
                },
                take: parseInt(limit),
                skip: parseInt(offset)
            })
        ]);

        return {
            data: messages,
            meta: {
                page: parseInt(page),
                limit: parseInt(limit),
                total
            }
        };
    }

    /**
     * Change status of a message (e.g., mark read, replied to, etc)
     */
    static async updateStatus(id, teamId, status) {
        await prisma.inbox_messages.updateMany({
            where: {
                id,
                team_id: teamId
            },
            data: {
                status
            }
        });
        return true;
    }

    /**
     * Fetch specific message
     */
    static async findById(id, teamId) {
        return await prisma.inbox_messages.findFirst({
            where: {
                id,
                team_id: teamId
            }
        });
    }

    /**
     * Create a new message
     */
    static async create(data) {
        return await prisma.inbox_messages.create({
            data: {
                id: data.id || require('uuid').v4(),
                team_id: data.team_id,
                platform: data.platform,
                external_id: data.external_id || `ext_${data.platform}_${Date.now()}`,
                sender_name: data.sender_name,
                sender_avatar: data.sender_avatar || (data.sender_name ? data.sender_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U'),
                message: data.message,
                status: data.status || 'unread',
                received_at: data.received_at || new Date()
            }
        });
    }
}

module.exports = InboxMessage;


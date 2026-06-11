const prisma = require('../config/prisma');
const { v4: uuidv4 } = require('uuid');

class TeamMember {
    /**
     * Get all members of a team
     */
    static async getTeamMembers(teamId) {
        const teamMembers = await prisma.team_members.findMany({
            where: {
                team_id: teamId
            },
            include: {
                users: {
                    select: {
                        id: true,
                        email: true,
                        username: true
                    }
                }
            }
        });

        return teamMembers.map(tm => ({
            membership_id: tm.id,
            role: tm.role,
            invited_at: tm.invited_at,
            joined_at: tm.joined_at,
            id: tm.users.id,
            email: tm.users.email,
            name: tm.users.username,
            username: tm.users.username,
            avatar: null
        }));
    }

    /**
     * Check a specific user's membership in a team
     */
    static async getMembership(teamId, userId) {
        return await prisma.team_members.findFirst({
            where: {
                team_id: teamId,
                user_id: parseInt(userId)
            }
        });
    }

    /**
     * Add a member to a team (also used for initial owner assignment)
     */
    static async addMember(teamId, userId, role = 'viewer') {
        const id = uuidv4();
        const joinedAt = new Date(); // Automatically assumed joined for simplicity in this flow

        const tm = await prisma.team_members.create({
            data: {
                id,
                team_id: teamId,
                user_id: parseInt(userId),
                role,
                invited_at: joinedAt,
                joined_at: joinedAt
            }
        });

        return {
            id: tm.id,
            teamId: tm.team_id,
            userId: tm.user_id,
            role: tm.role,
            joinedAt: tm.joined_at
        };
    }

    /**
     * Update a member's role
     */
    static async updateRole(teamId, userId, newRole) {
        await prisma.team_members.updateMany({
            where: {
                team_id: teamId,
                user_id: parseInt(userId)
            },
            data: {
                role: newRole
            }
        });
        return true;
    }

    /**
     * Remove a member from a team
     */
    static async removeMember(teamId, userId) {
        await prisma.team_members.deleteMany({
            where: {
                team_id: teamId,
                user_id: parseInt(userId)
            }
        });
        return true;
    }
}

module.exports = TeamMember;

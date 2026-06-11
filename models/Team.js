const prisma = require('../config/prisma');
const { v4: uuidv4 } = require('uuid');

class Team {
    /**
     * Find a team by its ID
     */
    static async findById(id) {
        return await prisma.teams.findFirst({
            where: {
                id
            }
        });
    }

    /**
     * Find all teams owned by a specific user
     */
    static async findByOwner(userId) {
        return await prisma.teams.findMany({
            where: {
                owner_id: parseInt(userId)
            }
        });
    }

    /**
     * Find teams a user belongs to (either owner or invited member)
     */
    static async findUserTeams(userId) {
        const teamMembers = await prisma.team_members.findMany({
            where: {
                user_id: parseInt(userId)
            },
            include: {
                teams: true
            }
        });

        return teamMembers.map(tm => ({
            ...tm.teams,
            role: tm.role
        }));
    }

    /**
     * Ensure slug is unique, or generate a numbered variant
     */
    static async getUniqueSlug(baseSlug) {
        let slug = baseSlug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        let counter = 1;

        while (true) {
            const currentSlug = counter === 1 ? slug : `${slug}-${counter}`;
            const count = await prisma.teams.count({
                where: {
                    slug: currentSlug
                }
            });

            if (count === 0) {
                return currentSlug; // Available!
            }
            counter++;
        }
    }

    /**
     * Create a new team
     */
    static async create(teamData) {
        const { name, owner_id, plan = 'free' } = teamData;
        let { slug } = teamData;

        // Generate UUID for team
        const id = uuidv4();

        // Auto-generate or validate slug
        if (!slug) {
            slug = await this.getUniqueSlug(name);
        } else {
            const count = await prisma.teams.count({
                where: {
                    slug
                }
            });
            if (count > 0) throw new Error('Slug already exists');
        }

        const settings = JSON.stringify({});

        // Create the team
        const team = await prisma.teams.create({
            data: {
                id,
                name,
                slug,
                owner_id: parseInt(owner_id),
                plan,
                settings
            }
        });

        return {
            id: team.id,
            name: team.name,
            slug: team.slug,
            owner_id: team.owner_id,
            plan: team.plan,
            settings: {}
        };
    }

    /**
     * Update a team
     */
    static async update(id, updates) {
        const data = {};

        if (updates.name) {
            data.name = updates.name;
        }

        if (updates.slug) {
            data.slug = updates.slug;
        }

        if (updates.settings) {
            data.settings = JSON.stringify(updates.settings);
        }

        if (Object.keys(data).length === 0) return null;

        await prisma.teams.update({
            where: {
                id
            },
            data
        });

        return this.findById(id);
    }

    /**
     * Delete a team
     */
    static async delete(id) {
        await prisma.teams.deleteMany({
            where: {
                id
            }
        });
        return true;
    }
}

module.exports = Team;

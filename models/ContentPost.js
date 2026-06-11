const prisma = require('../config/prisma');
const { v4: uuidv4 } = require('uuid');

class ContentPost {
    // Helper to parse platforms JSON string if needed
    static formatPost(post) {
        if (!post) return null;
        if (post.platforms && typeof post.platforms === 'string') {
            try {
                post.platforms = JSON.parse(post.platforms);
            } catch (e) {
                post.platforms = [];
            }
        } else if (!post.platforms) {
            post.platforms = [];
        }
        
        // Map author details if included
        if (post.users) {
            post.author_name = post.users.username;
            post.author_email = post.users.email;
            delete post.users;
        }
        
        return post;
    }

    /**
     * Fetch paginated list of posts for a team
     */
    static async getPosts(teamId, options = {}) {
        const {
            page = 1,
            limit = 50,
            status,
            startDate,
            endDate
        } = options;

        const offset = (page - 1) * limit;

        const where = {
            team_id: teamId
        };

        if (status) {
            where.status = status;
        }

        if (startDate || endDate) {
            where.scheduled_for = {};
            if (startDate) {
                where.scheduled_for.gte = new Date(startDate);
            }
            if (endDate) {
                where.scheduled_for.lte = new Date(endDate);
            }
        }

        const [total, posts] = await Promise.all([
            prisma.content_posts.count({ where }),
            prisma.content_posts.findMany({
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

        return {
            data: posts.map(post => this.formatPost(post)),
            meta: {
                page: parseInt(page),
                limit: parseInt(limit),
                total
            }
        };
    }

    /**
     * Fetch calendar view (all posts within a date range)
     */
    static async getCalendar(teamId, startDate, endDate) {
        const posts = await prisma.content_posts.findMany({
            where: {
                team_id: teamId,
                scheduled_for: {
                    gte: new Date(startDate),
                    lte: new Date(endDate)
                }
            },
            select: {
                id: true,
                title: true,
                status: true,
                scheduled_for: true,
                platforms: true
            },
            orderBy: {
                scheduled_for: 'asc'
            }
        });
        return posts.map(post => this.formatPost(post));
    }

    /**
     * Fetch a single post by ID including media
     */
    static async findById(id, teamId) {
        const post = await prisma.content_posts.findFirst({
            where: {
                id,
                team_id: teamId
            },
            include: {
                users: {
                    select: {
                        username: true
                    }
                },
                content_media: true
            }
        });

        if (!post) return null;

        // Map expected author_name
        if (post.users) {
            post.author_name = post.users.username;
            delete post.users;
        }

        // Map content_media to media
        if (post.content_media) {
            post.media = post.content_media;
            delete post.content_media;
        }

        return this.formatPost(post);
    }

    /**
     * Create a new post
     */
    static async create(postData) {
        const { team_id, author_id, title, content, platforms, status = 'draft', scheduled_for } = postData;
        const id = uuidv4();

        const platformsStr = platforms ? JSON.stringify(platforms) : JSON.stringify([]);

        const post = await prisma.content_posts.create({
            data: {
                id,
                team_id,
                author_id,
                title,
                content,
                platforms: platformsStr,
                status,
                scheduled_for: scheduled_for ? new Date(scheduled_for) : null
            }
        });

        return this.formatPost(post);
    }

    /**
     * Update an existing post
     */
    static async update(id, teamId, updates) {
        const data = {};
        
        const allowedFields = ['title', 'content', 'status'];
        allowedFields.forEach(field => {
            if (updates[field] !== undefined) {
                data[field] = updates[field];
            }
        });

        if (updates.scheduled_for !== undefined) {
            data.scheduled_for = updates.scheduled_for ? new Date(updates.scheduled_for) : null;
        }

        if (updates.platforms !== undefined) {
            data.platforms = JSON.stringify(updates.platforms);
        }

        if (Object.keys(data).length > 0) {
            await prisma.content_posts.updateMany({
                where: {
                    id,
                    team_id: teamId
                },
                data
            });
        }

        return this.findById(id, teamId);
    }

    /**
     * Delete a post
     */
    static async delete(id, teamId) {
        await prisma.content_posts.deleteMany({
            where: {
                id,
                team_id: teamId
            }
        });
        return true;
    }
}

module.exports = ContentPost;

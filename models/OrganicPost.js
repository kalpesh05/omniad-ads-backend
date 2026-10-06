const prisma = require('../config/prisma');
const { v4: uuidv4 } = require('uuid');

class OrganicPost {
    /**
     * Upsert a social media post/reel into the database
     */
    static async upsertPost(data) {
        const {
            teamId,
            platform,
            externalId,
            mediaType,
            title = null,
            caption = '',
            mediaUrl = null,
            thumbnailUrl = null,
            permalink = null,
            postedAt = new Date(),
            views = 0,
            reach = 0,
            impressions = 0,
            likes = 0,
            comments = 0,
            shares = 0,
            saved = 0,
            retentionRate = 0,
            aiScore = null,
            aiHookAudit = null,
            aiTags = null
        } = data;

        const totalInteractions = likes + comments + shares + saved;
        const denominator = reach > 0 ? reach : (views > 0 ? views : (impressions > 0 ? impressions : 1));
        const engagementRate = parseFloat(((totalInteractions / denominator) * 100).toFixed(2));

        return await prisma.organic_posts.upsert({
            where: {
                platform_external_id: {
                    platform,
                    external_id: externalId
                }
            },
            update: {
                team_id: teamId,
                media_type: mediaType,
                title,
                caption,
                media_url: mediaUrl,
                thumbnail_url: thumbnailUrl,
                permalink,
                posted_at: new Date(postedAt),
                views: parseInt(views) || 0,
                reach: parseInt(reach) || 0,
                impressions: parseInt(impressions) || 0,
                likes: parseInt(likes) || 0,
                comments: parseInt(comments) || 0,
                shares: parseInt(shares) || 0,
                saved: parseInt(saved) || 0,
                engagement_rate: engagementRate,
                retention_rate: retentionRate ? parseFloat(retentionRate) : 0,
                ...(aiScore !== null && { ai_score: aiScore }),
                ...(aiHookAudit !== null && { ai_hook_audit: aiHookAudit }),
                ...(aiTags !== null && { ai_tags: aiTags }),
                updated_at: new Date()
            },
            create: {
                id: uuidv4(),
                team_id: teamId,
                platform,
                external_id: externalId,
                media_type: mediaType,
                title,
                caption,
                media_url: mediaUrl,
                thumbnail_url: thumbnailUrl,
                permalink,
                posted_at: new Date(postedAt),
                views: parseInt(views) || 0,
                reach: parseInt(reach) || 0,
                impressions: parseInt(impressions) || 0,
                likes: parseInt(likes) || 0,
                comments: parseInt(comments) || 0,
                shares: parseInt(shares) || 0,
                saved: parseInt(saved) || 0,
                engagement_rate: engagementRate,
                retention_rate: retentionRate ? parseFloat(retentionRate) : 0,
                ai_score: aiScore,
                ai_hook_audit: aiHookAudit,
                ai_tags: aiTags
            }
        });
    }

    /**
     * Get paginated and filtered list of organic posts
     */
    static async getPosts(teamId, options = {}) {
        const {
            page = 1,
            limit = 50,
            platform,
            mediaType,
            search,
            sortBy = 'posted_at',
            sortOrder = 'desc',
            startDate,
            endDate
        } = options;

        const offset = (page - 1) * limit;
        const where = { team_id: teamId };

        if (platform && platform !== 'all') {
            where.platform = platform;
        }

        if (mediaType && mediaType !== 'all') {
            where.media_type = mediaType;
        }

        if (search) {
            where.OR = [
                { caption: { contains: search } },
                { title: { contains: search } }
            ];
        }

        if (startDate || endDate) {
            where.posted_at = {};
            if (startDate) where.posted_at.gte = new Date(startDate);
            if (endDate) where.posted_at.lte = new Date(endDate);
        }

        const validSortFields = ['posted_at', 'views', 'likes', 'comments', 'shares', 'saved', 'engagement_rate', 'ai_score'];
        const sortField = validSortFields.includes(sortBy) ? sortBy : 'posted_at';
        const direction = sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';

        const [total, posts] = await Promise.all([
            prisma.organic_posts.count({ where }),
            prisma.organic_posts.findMany({
                where,
                skip: offset,
                take: limit,
                orderBy: {
                    [sortField]: direction
                }
            })
        ]);

        return {
            data: posts,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Get high-level summary overview of organic performance
     */
    static async getOverview(teamId, periodDays = 30) {
        const startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

        const posts = await prisma.organic_posts.findMany({
            where: {
                team_id: teamId,
                posted_at: { gte: startDate }
            }
        });

        const totalPosts = posts.length;
        let totalViews = 0;
        let totalReach = 0;
        let totalLikes = 0;
        let totalComments = 0;
        let totalShares = 0;
        let totalSaved = 0;
        let totalEngRateSum = 0;

        const platformCounts = {};
        const mediaTypeCounts = {};

        for (const post of posts) {
            totalViews += post.views || 0;
            totalReach += post.reach || 0;
            totalLikes += post.likes || 0;
            totalComments += post.comments || 0;
            totalShares += post.shares || 0;
            totalSaved += post.saved || 0;
            totalEngRateSum += post.engagement_rate || 0;

            platformCounts[post.platform] = (platformCounts[post.platform] || 0) + 1;
            mediaTypeCounts[post.media_type] = (mediaTypeCounts[post.media_type] || 0) + 1;
        }

        const avgEngagementRate = totalPosts > 0 ? parseFloat((totalEngRateSum / totalPosts).toFixed(2)) : 0;
        const totalInteractions = totalLikes + totalComments + totalShares + totalSaved;

        // Top 5 performing posts
        const topPosts = [...posts]
            .sort((a, b) => (b.views || 0) - (a.views || 0))
            .slice(0, 5);

        return {
            summary: {
                totalPosts,
                totalViews,
                totalReach,
                totalLikes,
                totalComments,
                totalShares,
                totalSaved,
                totalInteractions,
                avgEngagementRate
            },
            platformDistribution: platformCounts,
            mediaTypeDistribution: mediaTypeCounts,
            topPosts
        };
    }

    /**
     * Update AI autopsy and scoring for a post
     */
    static async updateAiAnalysis(postId, aiScore, aiHookAudit, aiTags) {
        return await prisma.organic_posts.update({
            where: { id: postId },
            data: {
                ai_score: aiScore,
                ai_hook_audit: aiHookAudit,
                ai_tags: aiTags,
                updated_at: new Date()
            }
        });
    }
}

module.exports = OrganicPost;

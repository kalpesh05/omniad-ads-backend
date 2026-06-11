const ContentPost = require('../models/ContentPost');
const ContentMedia = require('../models/ContentMedia');
const AuditLog = require('../models/AuditLog');
const Subscription = require('../models/Subscription');
const { getPlanByPriceId } = require('../config/plans');
const { validationResult } = require('express-validator');

const ensureMockPosts = async (teamId, authorId) => {
    const [countRow] = await require('../config/database').pool.execute(
        'SELECT COUNT(*) as count FROM content_posts WHERE team_id = ?',
        [teamId]
    );

    if (countRow[0].count === 0) {
        const uuid = require('uuid');
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();

        const mockPosts = [
            {
                id: uuid.v4(),
                team_id: teamId,
                author_id: authorId,
                title: 'Product Launch Teaser',
                content: 'We are thrilled to give you a sneak peek of our newest product release! Stay tuned for more details.',
                platforms: ['instagram', 'facebook'],
                status: 'scheduled',
                scheduled_for: new Date(year, month, today.getDate() + 2, 9, 0, 0)
            },
            {
                id: uuid.v4(),
                team_id: teamId,
                author_id: authorId,
                title: 'Weekly Tips Carousel',
                content: 'Here are 5 ways to double your conversion rate with organic social strategies.',
                platforms: ['instagram', 'linkedin'],
                status: 'scheduled',
                scheduled_for: new Date(year, month, today.getDate() + 4, 12, 0, 0)
            },
            {
                id: uuid.v4(),
                team_id: teamId,
                author_id: authorId,
                title: 'Behind the Scenes',
                content: 'Meet the team behind growthOS. Hard at work building the future of digital ads.',
                platforms: ['instagram'],
                status: 'draft',
                scheduled_for: new Date(year, month, today.getDate() + 6, 18, 0, 0)
            },
            {
                id: uuid.v4(),
                team_id: teamId,
                author_id: authorId,
                title: 'Case Study Thread',
                content: 'How our client increased their monthly active users by 300% in just 90 days. A full breakdown.',
                platforms: ['linkedin'],
                status: 'scheduled',
                scheduled_for: new Date(year, month, today.getDate() + 8, 10, 0, 0)
            },
            {
                id: uuid.v4(),
                team_id: teamId,
                author_id: authorId,
                title: 'Weekend Promo',
                content: 'Get 20% off all plans this weekend only! Use code WEEKEND20 at checkout.',
                platforms: ['facebook', 'instagram'],
                status: 'scheduled',
                scheduled_for: new Date(year, month, today.getDate() + 10, 11, 0, 0)
            }
        ];

        for (const post of mockPosts) {
            await require('../config/database').pool.execute(
                `INSERT INTO content_posts (id, team_id, author_id, title, content, platforms, status, scheduled_for)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [post.id, post.team_id, post.author_id, post.title, post.content, JSON.stringify(post.platforms), post.status, post.scheduled_for]
            );
        }
    }
};

exports.getPosts = async (req, res) => {
    try {
        const { teamId } = req.query;
        if (!teamId) {
            return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'teamId is required' } });
        }

        await ensureMockPosts(teamId, req.user.id);

        const options = {
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 20,
            status: req.query.status,
            startDate: req.query.startDate,
            endDate: req.query.endDate
        };

        const posts = await ContentPost.getPosts(teamId, options);

        res.status(200).json({
            success: true,
            data: posts.data,
            meta: posts.meta
        });
    } catch (error) {
        console.error('Error fetching content posts:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch content posts' } });
    }
};

exports.createPost = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: errors.array() } });
        }

        const { teamId } = req.body;
        if (!teamId) return res.status(400).json({ success: false, message: 'teamId is required' });

        // Enforce usage limits
        const subscription = await Subscription.getByTeamId(teamId);
        // IF subscription is inactive (e.g. past_due, canceled), fallback to free limits immediately
        const isActive = subscription && ['active', 'trialing'].includes(subscription.status);
        const planTier = isActive ? subscription.plan_id : 'free';

        let planConfig;

        try {
            planConfig = getPlanByPriceId(planTier);
        } catch (e) {
            planConfig = require('../config/plans').PLANS['free'];
        }

        const postLimit = planConfig.limits.posts_per_month;

        if (postLimit !== -1) {
            const [countData] = await ContentPost.query(
                `SELECT COUNT(*) as currentMonthPosts FROM content_posts 
                 WHERE team_id = ? AND MONTH(created_at) = MONTH(CURRENT_DATE()) AND YEAR(created_at) = YEAR(CURRENT_DATE())`,
                [teamId]
            );

            if (countData.currentMonthPosts >= postLimit) {
                return res.status(402).json({
                    success: false,
                    error: {
                        code: 'PAYMENT_REQUIRED',
                        message: `Monthly post limit of ${postLimit} reached for your ${planConfig.name} plan. Please upgrade to create more.`
                    }
                });
            }
        }

        const newPost = await ContentPost.create({
            team_id: teamId,
            author_id: req.user.id,
            title: req.body.title,
            content: req.body.content,
            platforms: req.body.platforms,
            status: req.body.status,
            scheduled_for: req.body.scheduledFor
        });

        await AuditLog.logAction(req, teamId, 'content.created', 'post', newPost.id, newPost.title);

        res.status(201).json({ success: true, data: newPost, message: 'Post created successfully' });
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create post' } });
    }
};

exports.updatePost = async (req, res) => {
    try {
        const { id } = req.params;
        const { teamId } = req.body;
        if (!teamId) return res.status(400).json({ success: false, message: 'teamId is required for update validation' });

        const updates = {
            title: req.body.title,
            content: req.body.content,
            platforms: req.body.platforms,
            status: req.body.status,
            scheduled_for: req.body.scheduledFor
        };

        // Filter out undefined
        Object.keys(updates).forEach(key => updates[key] === undefined && delete updates[key]);

        const updated = await ContentPost.update(id, teamId, updates);

        if (!updated) {
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Post not found' } });
        }

        await AuditLog.logAction(req, teamId, 'content.updated', 'post', id, updated.title);

        res.status(200).json({ success: true, data: updated, message: 'Post updated' });
    } catch (error) {
        console.error('Error updating post:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update post' } });
    }
};

exports.deletePost = async (req, res) => {
    try {
        const { id } = req.params;
        const { teamId } = req.query; // Usually passed in query or body

        if (!teamId) return res.status(400).json({ success: false, message: 'teamId query param is required' });

        const post = await ContentPost.findById(id, teamId);
        if (!post) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Post not found' } });

        await ContentPost.delete(id, teamId);
        await AuditLog.logAction(req, teamId, 'content.deleted', 'post', id, post.title);

        res.status(200).json({ success: true, message: 'Post deleted' });
    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete post' } });
    }
};

exports.getCalendar = async (req, res) => {
    try {
        const { teamId, startDate, endDate } = req.query;

        if (!teamId || !startDate || !endDate) {
            return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'teamId, startDate, and endDate are required' } });
        }

        await ensureMockPosts(teamId, req.user.id);

        const calendar = await ContentPost.getCalendar(teamId, startDate, endDate);
        res.status(200).json({ success: true, data: calendar });
    } catch (error) {
        console.error('Error fetching calendar:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch calendar' } });
    }
};

exports.uploadMedia = async (req, res) => {
    try {
        const { postId } = req.body;

        if (!postId) {
            return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'postId is required in form-data' } });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'No file uploaded' } });
        }

        // Since we are not using S3 locally yet, construct local URL stub
        // Usually host + filename
        const fileUrl = `/uploads/${req.file.filename}`;

        const media = await ContentMedia.addMedia(postId, {
            filename: req.file.filename,
            original_name: req.file.originalname,
            mime_type: req.file.mimetype,
            size: req.file.size,
            url: fileUrl
        });

        res.status(201).json({ success: true, data: media, message: 'Media uploaded successfully' });
    } catch (error) {
        console.error('Error uploading media:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to upload media' } });
    }
};

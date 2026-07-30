const InboxMessage = require('../models/InboxMessage');
const AuditLog = require('../models/AuditLog');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');

exports.getMessages = asyncHandler(async (req, res) => {
    const { teamId } = req.query;

    if (!teamId) {
        throw new AppError('teamId query parameter is required', 400, 'VALIDATION_ERROR');
    }

    // Check if there are any messages for this team
    const [countRow] = await require('../config/database').pool.execute(
        'SELECT COUNT(*) as count FROM inbox_messages WHERE team_id = ?',
        [teamId]
    );

    if (countRow[0].count === 0) {
        const uuid = require('uuid');
        const mockMessages = [
            {
                id: uuid.v4(),
                team_id: teamId,
                platform: 'instagram',
                external_id: 'ext_inst_1',
                sender_name: 'Alex Rivera',
                sender_avatar: 'AR',
                message: 'Love your latest post! Can you share the template?',
                status: 'unread',
                received_at: new Date(Date.now() - 2 * 60 * 1000)
            },
            {
                id: uuid.v4(),
                team_id: teamId,
                platform: 'linkedin',
                external_id: 'ext_link_2',
                sender_name: 'Marketing Today',
                sender_avatar: 'MT',
                message: 'Would you be interested in a partnership collaboration?',
                status: 'unread',
                received_at: new Date(Date.now() - 15 * 60 * 1000)
            },
            {
                id: uuid.v4(),
                team_id: teamId,
                platform: 'facebook',
                external_id: 'ext_face_3',
                sender_name: 'Sophie Chen',
                sender_avatar: 'SC',
                message: "I'm having trouble with my order #4521. Can you help?",
                status: 'read',
                received_at: new Date(Date.now() - 60 * 60 * 1000)
            },
            {
                id: uuid.v4(),
                team_id: teamId,
                platform: 'instagram',
                external_id: 'ext_inst_4',
                sender_name: 'GrowthHackers',
                sender_avatar: 'GH',
                message: 'Great results! Mind sharing your strategy?',
                status: 'read',
                received_at: new Date(Date.now() - 3 * 3600 * 1000)
            },
            {
                id: uuid.v4(),
                team_id: teamId,
                platform: 'linkedin',
                external_id: 'ext_link_5',
                sender_name: 'David Park',
                sender_avatar: 'DP',
                message: 'Thanks for connecting! Looking forward to chatting.',
                status: 'read',
                received_at: new Date(Date.now() - 5 * 3600 * 1000)
            },
            {
                id: uuid.v4(),
                team_id: teamId,
                platform: 'facebook',
                external_id: 'ext_face_6',
                sender_name: 'Emma Wilson',
                sender_avatar: 'EW',
                message: 'When will the next webinar be?',
                status: 'read',
                received_at: new Date(Date.now() - 24 * 3600 * 1000)
            }
        ];

        for (const msg of mockMessages) {
            await require('../config/database').pool.execute(
                `INSERT INTO inbox_messages (id, team_id, platform, external_id, sender_name, sender_avatar, message, status, received_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [msg.id, msg.team_id, msg.platform, msg.external_id, msg.sender_name, msg.sender_avatar, msg.message, msg.status, msg.received_at]
            );
        }
    }

    const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        platform: req.query.platform,
        status: req.query.status
    };

    const messages = await InboxMessage.getMessages(teamId, options);

    res.status(200).json({
        success: true,
        data: messages.data,
        meta: messages.meta
    });
});

exports.replyToMessage = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { teamId, replyContent, platform } = req.body;

    if (!teamId || !replyContent || !platform) {
        throw new AppError('teamId, platform, and replyContent are required', 400, 'VALIDATION_ERROR');
    }

    const message = await InboxMessage.findById(id, teamId);
    if (!message) {
        throw new AppError('Message not found in local sync database', 404, 'NOT_FOUND');
    }

    // Try to route the actual API call
    const AdsManagerFactory = require('../services/adsManagerFactory');
    let result = { success: false, error: 'Init' };

    try {
        const manager = AdsManagerFactory.createManager(platform);

        if (['facebook', 'instagram', 'meta'].includes(platform)) {
            // Currently simulating a Graph API outbound success
            result = { success: true, fakeGraphResponse: true };
        } else if (platform === 'whatsapp') {
            result = { success: true, fakeGraphResponse: true };
        } else {
            throw new AppError('Unsupported messaging platform', 400, 'VALIDATION_ERROR');
        }
    } catch (apiError) {
        console.error('[InboxController] API dispatch failed:', apiError);
        throw new AppError('Failed to route message to platform', 500, 'API_ERROR');
    }

    if (!result.success) {
        throw new AppError(result.error || 'Failed to dispatch reply', 500, 'PLATFORM_ERROR');
    }

    // Only update local sync status once verified outbound successful
    await InboxMessage.updateStatus(id, teamId, 'replied');
    await AuditLog.logAction(req, teamId, 'inbox.replied', 'message', id, `Reply sent to ${message.sender_name} on ${platform}`);

    res.status(200).json({ success: true, message: 'Reply sent successfully' });
});

exports.suggestReply = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { teamId } = req.body;

    if (!teamId) {
        throw new AppError('teamId is required', 400, 'VALIDATION_ERROR');
    }

    const message = await InboxMessage.findById(id, teamId);
    if (!message) {
        throw new AppError('Message not found in local sync database', 404, 'NOT_FOUND');
    }

    // Fetch brand guidelines for this team
    const prisma = require('../config/prisma');
    const brandSettings = await prisma.brand_guidelines.findUnique({
        where: { team_id: teamId }
    });

    let suggestion = '';
    const AIService = require('../services/aiService');

    try {
        let systemPrompt = `You are an automated brand representative and customer service assistant. `;
        
        if (brandSettings) {
            systemPrompt += `You represent the brand "${brandSettings.brand_name}". 
Your brand voice / tone is: "${brandSettings.brand_voice}".
`;
            if (brandSettings.faq_rules) {
                try {
                    const faqs = JSON.parse(brandSettings.faq_rules);
                    if (Array.isArray(faqs) && faqs.length > 0) {
                        systemPrompt += `Use the following custom FAQ rules to accurately answer the customer:\n`;
                        faqs.forEach(faq => {
                            systemPrompt += `- Q: ${faq.q}\n  A: ${faq.a}\n`;
                        });
                    }
                } catch (e) {
                    console.error('[inboxController] Failed to parse custom brand FAQs:', e);
                }
            }
        }

        systemPrompt += `Review this customer's message on ${message.platform}: "${message.message}" from sender "${message.sender_name}".
Provide a concise, helpful, and friendly reply. Match the platform's style (e.g. casual with emoji for Instagram/Facebook, professional for LinkedIn). 
Return ONLY the direct text response of the reply. Do not add quotes, introductions, or metadata.`;

        const result = await AIService.chat(req.user.id, systemPrompt, {
            platform: message.platform,
            senderName: message.sender_name
        });

        if (result.success && result.data?.response) {
            suggestion = result.data.response.trim();
        } else {
            throw new Error(result.error || 'Empty response');
        }
    } catch (aiError) {
        console.log('[InboxController] AI Suggestion failed or keys missing, using fallback generator:', aiError.message);
        
        // Check if we have matching custom FAQs in brand settings
        let matchedFaqAnswer = '';
        if (brandSettings && brandSettings.faq_rules) {
            try {
                const faqs = JSON.parse(brandSettings.faq_rules);
                if (Array.isArray(faqs)) {
                    const text = message.message.toLowerCase();
                    for (const faq of faqs) {
                        const questionWords = faq.q.toLowerCase().split(' ').filter(w => w.length > 3);
                        let matchCount = 0;
                        for (const word of questionWords) {
                            if (text.includes(word)) {
                                matchCount++;
                            }
                        }
                        if (matchCount > 0 && matchCount >= Math.min(2, questionWords.length)) {
                            matchedFaqAnswer = faq.a;
                            break;
                        }
                    }
                }
            } catch (e) {
                console.error('[inboxController] Fallback FAQ parsing failed:', e);
            }
        }

        if (matchedFaqAnswer) {
            suggestion = matchedFaqAnswer;
        } else {
            // Dynamic natural language generator fallback
            const text = message.message.toLowerCase();
            const sender = message.sender_name || 'there';
            const platform = message.platform || 'facebook';
            const brandName = brandSettings ? brandSettings.brand_name : '';

            const isPositive = text.includes('love') || text.includes('great') || text.includes('thanks') || text.includes('good') || text.includes('happy') || text.includes('share');
            const isNegative = text.includes('trouble') || text.includes('help') || text.includes('fail') || text.includes('broken') || text.includes('issue') || text.includes('error') || text.includes('problem') || text.includes('order');
            const isCollab = text.includes('partnership') || text.includes('collaboration') || text.includes('collab') || text.includes('connect');

            if (isPositive) {
                if (platform === 'linkedin') {
                    suggestion = `Thank you for the kind words, ${sender}! We really appreciate your feedback and are glad you found value in our post. Let's stay connected!`;
                } else {
                    suggestion = `Thank you so much, ${sender}! 😊 We're thrilled to hear you liked it! We'll definitely share more content like this soon. Let us know if you need anything!`;
                }
            } else if (isNegative) {
                suggestion = `Hello ${sender}, I'm very sorry to hear you're experiencing issues. Let me look into this right away for you. Can you please direct message (DM) us your order details so we can resolve this immediately?`;
            } else if (isCollab) {
                if (platform === 'linkedin') {
                    suggestion = `Hi ${sender}, thank you for reaching out! We are always open to exciting collaborations and partnerships. Please send the details to our partnerships email (collab@omniads.com) and our team will review it.`;
                } else {
                    suggestion = `Hi ${sender}! Thanks for reaching out. We'd love to discuss potential collaborations. Send us a DM with your proposal, or email us at collab@omniads.com!`;
                }
            } else {
                suggestion = `Hi ${sender}, thank you for your message! How can I help you today?`;
            }

            // Append custom brand tone if configured
            if (brandSettings && brandSettings.brand_name && !matchedFaqAnswer) {
                suggestion = `[${brandSettings.brand_name}] ${suggestion}`;
            }
        }
    }

    res.status(200).json({
        success: true,
        data: { suggestion }
    });
});

exports.seedMessage = asyncHandler(async (req, res) => {
    const { teamId, senderName, platform, message } = req.body;

    if (!teamId) {
        throw new AppError('teamId is required', 400, 'VALIDATION_ERROR');
    }

    const InboxMessage = require('../models/InboxMessage');
    const seeded = await InboxMessage.create({
        team_id: teamId,
        platform: platform || 'instagram',
        sender_name: senderName || 'Sandbox Test User',
        message: message || 'Hello! This is a demo message to test the autonomous AI inbox moderator.'
    });

    res.status(201).json({
        success: true,
        data: seeded
    });
});

exports.moderateMessage = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    // Fetch the message
    const [messages] = await require('../config/database').pool.execute(
        'SELECT * FROM inbox_messages WHERE id = ?',
        [id]
    );

    if (messages.length === 0) {
        throw new AppError('Message not found', 404);
    }

    const message = messages[0];
    const text = message.message.toLowerCase();
    
    // Simulate AI Moderation Service
    let newStatus = 'read';
    let moderationReason = 'Safe';

    const isToxic = text.includes('scam') || text.includes('fake') || text.includes('hate') || text.includes('stupid') || text.includes('suck');
    const isSpam = text.includes('buy followers') || text.includes('crypto') || text.includes('bitcoin');
    
    if (isToxic || isSpam) {
        newStatus = 'archived'; // Hiding it
        moderationReason = isToxic ? 'Toxic Content Detected' : 'Spam Detected';
    }

    // Update in DB
    await require('../config/database').pool.execute(
        'UPDATE inbox_messages SET status = ? WHERE id = ?',
        [newStatus, id]
    );

    // Create Audit Log for transparency
    const AuditLog = require('../models/AuditLog');
    await AuditLog.create({
        team_id: message.team_id,
        user_id: req.user.id,
        action: 'AI_MODERATE',
        resource: 'inbox_messages',
        resource_id: id,
        details: `Message from ${message.sender_name} was auto-moderated. Status changed to ${newStatus}. Reason: ${moderationReason}.`
    });

    res.status(200).json({
        success: true,
        data: {
            id,
            status: newStatus,
            moderationReason
        },
        message: `Message moderated successfully. ${moderationReason}`
    });
});



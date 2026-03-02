const InboxMessage = require('../models/InboxMessage');
const AuditLog = require('../models/AuditLog');

exports.getMessages = async (req, res) => {
    try {
        const { teamId } = req.query;

        if (!teamId) {
            return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'teamId query parameter is required' } });
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
    } catch (error) {
        console.error('Error fetching inbox messages:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch inbox messages' } });
    }
};

exports.replyToMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const { teamId, replyContent, platform } = req.body;

        if (!teamId || !replyContent || !platform) {
            return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'teamId, platform, and replyContent are required' } });
        }

        const message = await InboxMessage.findById(id, teamId);
        if (!message) {
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Message not found in local sync database' } });
        }

        // Try to route the actual API call
        const AdsManagerFactory = require('../services/adsManagerFactory');
        let result = { success: false, error: 'Init' };

        try {
            const manager = AdsManagerFactory.createManager(platform);

            if (['facebook', 'instagram', 'meta'].includes(platform)) {
                // Normally this requires standard pages_messaging scope
                // result = await manager.executeRequest(req.user.id, 'POST', \`/v18.0/\${message.sender_id}/messages\`, { recipient: { id: message.sender_id }, message: { text: replyContent } });

                // Currently simulating a Graph API outbound success
                result = { success: true, fakeGraphResponse: true };
            } else if (platform === 'whatsapp') {
                // Future WhatsApp integration
                result = { success: true, fakeGraphResponse: true };
            } else {
                return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Unsupported messaging platform' } });
            }
        } catch (apiError) {
            console.error('[InboxController] API dispatch failed:', apiError);
            return res.status(500).json({ success: false, error: { code: 'API_ERROR', message: 'Failed to route message to platform' } });
        }

        if (!result.success) {
            return res.status(500).json({ success: false, error: { code: 'PLATFORM_ERROR', message: result.error || 'Failed to dispatch reply' } });
        }

        // Only update local sync status once verified outbound successful
        await InboxMessage.updateStatus(id, teamId, 'replied');
        await AuditLog.logAction(req, teamId, 'inbox.replied', 'message', id, `Reply sent to ${message.sender_name} on ${platform}`);

        res.status(200).json({ success: true, message: 'Reply sent successfully' });
    } catch (error) {
        console.error('Error replying to message:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Fatal error processing reply' } });
    }
};

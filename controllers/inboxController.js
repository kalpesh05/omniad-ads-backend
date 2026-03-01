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
        const { teamId, replyContent } = req.body;

        if (!teamId || !replyContent) {
            return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'teamId and replyContent are required' } });
        }

        const message = await InboxMessage.findById(id, teamId);
        if (!message) {
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Message not found' } });
        }

        // Usually, here you would call Facebook/Instagram/Google API to send the actual reply text natively.
        // For this implementation, we just mock the success and update our local status.
        await InboxMessage.updateStatus(id, teamId, 'replied');

        await AuditLog.logAction(req, teamId, 'inbox.replied', 'message', id, `Reply sent to ${message.sender_name}`);

        res.status(200).json({ success: true, message: 'Reply sent successfully' });
    } catch (error) {
        console.error('Error replying to message:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to reply to message' } });
    }
};

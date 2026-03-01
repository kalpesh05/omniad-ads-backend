const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');

exports.getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;

        const options = {
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 20,
            unreadOnly: req.query.unread === 'true'
        };

        const notifications = await Notification.getForUser(userId, options);

        res.status(200).json({
            success: true,
            data: notifications.data,
            meta: notifications.meta
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch notifications' } });
    }
};

exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        await Notification.markAsRead(id, userId);

        res.status(200).json({ success: true, message: 'Notification marked as read' });
    } catch (error) {
        console.error('Error marking notification read:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to mark notification read' } });
    }
};

exports.markAllAsRead = async (req, res) => {
    try {
        const userId = req.user.id;

        await Notification.markAllAsRead(userId);

        res.status(200).json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Error marking all notifications read:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to mark notifications read' } });
    }
};

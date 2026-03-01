const TeamSettings = require('../models/TeamSettings');
const AuditLog = require('../models/AuditLog');
const { validationResult } = require('express-validator');

exports.getSettings = async (req, res) => {
    try {
        const { teamId } = req.query;
        if (!teamId) return res.status(400).json({ success: false, message: 'teamId is required' });

        let settings = await TeamSettings.getByTeamId(teamId);

        // In rare cases where a team was created before settings logic existed
        if (!settings) {
            settings = await TeamSettings.initializeForTeam(teamId);
        }

        res.status(200).json({ success: true, data: settings });
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch team settings' } });
    }
};

exports.updateSettings = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: errors.array() } });
        }

        const { teamId } = req.body;
        if (!teamId) return res.status(400).json({ success: false, message: 'teamId is required' });

        const updates = {
            timezone: req.body.timezone,
            notification_preferences: req.body.notificationPreferences,
            auto_publish: req.body.autoPublish
        };

        // Remove undefined
        Object.keys(updates).forEach(key => updates[key] === undefined && delete updates[key]);

        const updatedSettings = await TeamSettings.update(teamId, updates);
        await AuditLog.logAction(req, teamId, 'settings.updated', 'team_settings', teamId, 'Team settings updated');

        res.status(200).json({ success: true, data: updatedSettings, message: 'Settings updated successfully' });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update settings' } });
    }
};

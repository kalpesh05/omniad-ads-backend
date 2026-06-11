const AuditLog = require('../models/AuditLog');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');

exports.getAuditLogs = asyncHandler(async (req, res) => {
    const { teamId } = req.query; // Assume teamId is passed as query param to look up team logs

    if (!teamId) {
        throw new AppError('teamId is required', 400, 'VALIDATION_ERROR');
    }

    const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 50,
        userId: req.query.userId,
        action: req.query.action,
        resource: req.query.resource,
        startDate: req.query.startDate,
        endDate: req.query.endDate
    };

    const logs = await AuditLog.getLogs(teamId, options);

    // Format output to match API Docs
    const formattedData = logs.data.map(log => ({
        id: log.id,
        action: log.action,
        resource: log.resource,
        resourceId: log.resource_id,
        resourceName: log.resource_name,
        user: {
            id: log.user_id,
            name: log.user_name,
            email: log.user_email
        },
        details: log.details,
        ipAddress: log.ip_address,
        userAgent: log.user_agent,
        createdAt: log.created_at
    }));

    res.status(200).json({
        success: true,
        data: formattedData,
        meta: logs.meta
    });
});


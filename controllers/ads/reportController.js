const ConnectedAccount = require('../../models/ConnectedAccount');
const AdsManagerFactory = require('../../services/adsManagerFactory');
const AdPlatformAuthenticator = require('../../utils/adsPlatformAuthenticator');
const AnalyticsService = require('../../services/analyticsService');
const AIService = require('../../services/aiService');
const ReportsService = require('../../services/reportsService');
const Campaign = require('../../models/Campaign');
const { queryToDateRange, formatMonthlyDataForChart, getYearDateRange, sortMonthlyChartData, formatDeviceDistributionForChart, addPercentageToData } = require('../../utils/common');
const {
    successResponse,
    errorResponse,
    unauthorizedResponse,
    conflictResponse,
    notFoundResponse
} = require('../../utils/response');
const Subscription = require('../../models/Subscription');
const { getPlanByPriceId } = require('../../config/plans');


class ReportController {
    static async generateReport(req, res) {
        try {
            const reportData = req.body;
            const userId = req.user.id;

            const reportsService = new ReportsService();
            const result = await reportsService.generateReport(userId, reportData);

            if (!result.success) {
                return errorResponse(res, result.error);
            }

            successResponse(res, result.data, 'Report generated successfully', 201);
        } catch (error) {
            console.error('Generate Report Error:', error);
            errorResponse(res, 'Failed to generate report');
        }
    }

    static async getReports(req, res) {
        try {
            const { status, type, teamId } = req.query;
            const userId = req.user.id;

            if (!teamId) return errorResponse(res, 'teamId is required', 400);

            const reportsService = new ReportsService();
            const result = await reportsService.getReports(userId, teamId, { status, type });

            if (!result.success) {
                return errorResponse(res, result.error);
            }

            successResponse(res, result.data, 'Reports retrieved successfully');
        } catch (error) {
            console.error('Get Reports Error:', error);
            errorResponse(res, 'Failed to retrieve reports');
        }
    }

    static async downloadReport(req, res) {
        try {
            const { id } = req.params;
            const { teamId } = req.query;
            const userId = req.user.id;

            if (!teamId) return errorResponse(res, 'teamId is required', 400);

            const reportsService = new ReportsService();
            const result = await reportsService.downloadReport(userId, id, teamId);

            if (!result.success) {
                return errorResponse(res, result.error);
            }

            res.setHeader('Content-Type', result.data.contentType);
            res.setHeader('Content-Disposition', `attachment; filename="${result.data.fileName}"`);
            res.send(result.data.content);
        } catch (error) {
            console.error('Download Report Error:', error);
            errorResponse(res, 'Failed to download report');
        }
    }

    static async exportAnalyticsGeneric(req, res) {
        try {
            successResponse(res, { exportUrl: '#' }, 'Analytics export successful');
        } catch (error) {
            console.error('Analytics Export Error:', error);
            errorResponse(res, 'Failed to export analytics');
        }
    }

}

module.exports = ReportController;

class ReportsService {
  constructor() {
    this.reports = new Map(); // In-memory storage, replace with database in production
  }

  async generateReport(userId, reportData) {
    try {
      const reportId = `report_${Date.now()}_${userId}`;
      const report = {
        id: reportId,
        userId,
        ...reportData,
        status: 'completed',
        createdAt: new Date().toISOString(),
        downloadUrl: `/api/reports/${reportId}/download`
      };

      this.reports.set(reportId, report);

      return {
        success: true,
        data: report
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getReports(userId, filters = {}) {
    try {
      // Filter reports by userId
      const userReports = Array.from(this.reports.values())
        .filter(report => report.userId === userId);

      // Apply additional filters if provided
      let filteredReports = userReports;
      if (filters.status) {
        filteredReports = filteredReports.filter(r => r.status === filters.status);
      }
      if (filters.type) {
        filteredReports = filteredReports.filter(r => r.type === filters.type);
      }

      return {
        success: true,
        data: {
          reports: filteredReports,
          total: filteredReports.length
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getReportById(userId, reportId) {
    try {
      const report = this.reports.get(reportId);
      
      if (!report) {
        return { success: false, error: 'Report not found' };
      }

      if (report.userId !== userId) {
        return { success: false, error: 'Unauthorized access to report' };
      }

      return {
        success: true,
        data: report
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async downloadReport(userId, reportId) {
    try {
      const report = this.reports.get(reportId);
      
      if (!report) {
        return { success: false, error: 'Report not found' };
      }

      if (report.userId !== userId) {
        return { success: false, error: 'Unauthorized access to report' };
      }

      // Generate report file content (CSV, PDF, etc.)
      const fileContent = this.generateFileContent(report);

      return {
        success: true,
        data: {
          reportId,
          fileName: `${report.name || reportId}.csv`,
          contentType: 'text/csv',
          content: fileContent
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  generateFileContent(report) {
    // Simple CSV generation
    const headers = ['Metric', 'Value'];
    const rows = [
      ['Report ID', report.id],
      ['Report Name', report.name || 'N/A'],
      ['Created At', report.createdAt],
      ['Status', report.status]
    ];

    if (report.data) {
      Object.entries(report.data).forEach(([key, value]) => {
        rows.push([key, JSON.stringify(value)]);
      });
    }

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    return csv;
  }
}

module.exports = ReportsService;


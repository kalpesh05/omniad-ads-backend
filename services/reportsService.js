const puppeteer = require('puppeteer');
const prisma = require('../config/prisma');

class ReportsService {
  constructor() {
    this.reports = new Map();
  }

  async generateReport(userId, reportData) {
    try {
      const { teamId, name, type, dateRange } = reportData;

      const report = await prisma.client_reports.create({
        data: {
          team_id: teamId,
          report_name: name || 'Monthly Performance Report',
          date_range: dateRange || 'Last 30 Days',
          status: 'completed',
        }
      });

      return {
        success: true,
        data: { ...report, downloadUrl: `/api/reports/${report.id}/download` }
      };
    } catch (error) {
      console.error('Generate Report Error:', error);
      return { success: false, error: error.message };
    }
  }

  async getReports(userId, teamId, filters = {}) {
    try {
      if (!teamId) throw new Error('teamId is required');

      let whereClause = { team_id: teamId };
      if (filters.status) whereClause.status = filters.status;

      const reports = await prisma.client_reports.findMany({
        where: whereClause,
        orderBy: { created_at: 'desc' }
      });

      return {
        success: true,
        data: {
          reports,
          total: reports.length
        }
      };
    } catch (error) {
      console.error('Get Reports Error:', error);
      return { success: false, error: error.message };
    }
  }

  async getReportById(userId, reportId) {
    try {
      const report = await prisma.client_reports.findUnique({
        where: { id: reportId }
      });
      if (!report) return { success: false, error: 'Report not found' };

      return { success: true, data: report };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async downloadReport(userId, reportId, teamId) {
    try {
      const report = await prisma.client_reports.findUnique({
        where: { id: reportId }
      });
      
      if (!report) {
        return { success: false, error: 'Report not found' };
      }

      // Fetch team branding
      const branding = await prisma.brand_guidelines.findUnique({
        where: { team_id: report.team_id }
      });

      const brandName = branding?.brand_name || 'OmniAds Premium';
      const brandVoice = branding?.brand_voice || 'Professional';

      // Generate the PDF
      const pdfBuffer = await this.generatePDFContent(report, brandName, brandVoice);

      return {
        success: true,
        data: {
          reportId,
          fileName: `${report.report_name.replace(/\s+/g, '_')}.pdf`,
          contentType: 'application/pdf',
          content: pdfBuffer
        }
      };
    } catch (error) {
      console.error('Download Report Error:', error);
      return { success: false, error: error.message };
    }
  }

  async generatePDFContent(report, brandName, brandVoice) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${report.report_name}</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 0; padding: 40px; background-color: #f9f9fb; }
          .container { background-color: #fff; padding: 40px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #eaeaea; padding-bottom: 20px; margin-bottom: 30px; }
          .brand { font-size: 28px; font-weight: bold; color: #2563eb; }
          .report-title { font-size: 24px; color: #111; margin-bottom: 5px; }
          .report-meta { color: #666; font-size: 14px; }
          .metrics { display: flex; justify-content: space-between; gap: 20px; margin-bottom: 40px; }
          .metric-card { flex: 1; background: #f0fdf4; padding: 20px; border-radius: 8px; border: 1px solid #bbf7d0; text-align: center; }
          .metric-value { font-size: 32px; font-weight: bold; color: #166534; margin-bottom: 5px; }
          .metric-label { font-size: 14px; color: #15803d; text-transform: uppercase; letter-spacing: 1px; }
          .voice-note { font-style: italic; color: #555; background: #eff6ff; padding: 15px; border-left: 4px solid #3b82f6; }
          .footer { margin-top: 50px; text-align: center; color: #999; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div>
              <div class="brand">${brandName}</div>
              <div style="font-size: 12px; color: #666; margin-top: 4px;">Powered by OmniAds</div>
            </div>
            <div style="text-align: right;">
              <div class="report-title">${report.report_name}</div>
              <div class="report-meta">Date Range: ${report.date_range} | Generated: ${new Date().toLocaleDateString()}</div>
            </div>
          </div>

          <div class="voice-note">
            "Delivering ${brandVoice.toLowerCase()} results for your brand." - ${brandName} Team
          </div>

          <h3 style="margin-top: 40px; color: #333;">Performance Highlights</h3>
          <div class="metrics">
            <div class="metric-card">
              <div class="metric-value">1,245,000</div>
              <div class="metric-label">Total Impressions</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">84,500</div>
              <div class="metric-label">Clicks</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">$4,250</div>
              <div class="metric-label">Ad Spend</div>
            </div>
          </div>

          <h3 style="color: #333;">Actionable Insights</h3>
          <ul>
            <li style="margin-bottom: 10px; line-height: 1.5;"><strong>Audience Engagement:</strong> We saw a 24% increase in click-through rates following the creative refresh.</li>
            <li style="margin-bottom: 10px; line-height: 1.5;"><strong>Cost Efficiency:</strong> CPC decreased by $0.12 this month due to algorithmic budget reallocation.</li>
            <li style="margin-bottom: 10px; line-height: 1.5;"><strong>Next Steps:</strong> Scaling budget on top-performing campaigns by 15% next week.</li>
          </ul>

          <div class="footer">
            Confidential Report for ${brandName} Clients
          </div>
        </div>
      </body>
      </html>
    `;

    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    return pdf;
  }
}

module.exports = ReportsService;


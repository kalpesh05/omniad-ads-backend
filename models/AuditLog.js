const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class AuditLog {
    /**
     * Run raw queries safely
     */
    static async query(sql, params) {
        const [rows, fields] = await pool.execute(sql, params);
        return rows;
    }

    /**
     * Log an action (usually called internally by other controllers)
     */
    static async logAction(req, teamId, action, resource, resourceId, resourceName, details = {}) {
        try {
            const id = uuidv4();
            const userId = req.user ? req.user.id : null;
            const ipAddress = req.ip || req.connection.remoteAddress || null;
            const userAgent = req.headers ? req.headers['user-agent'] : null;

            const sql = `
        INSERT INTO audit_logs 
        (id, team_id, user_id, action, resource, resource_id, resource_name, details, ip_address, user_agent) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

            await this.query(sql, [
                id, teamId, userId, action, resource, resourceId, resourceName,
                JSON.stringify(details), ipAddress, userAgent
            ]);

            return true;
        } catch (error) {
            console.error('Failed to write audit log:', error);
            // Suppress error so it doesn't break main flow, but log it to console
            return false;
        }
    }

    /**
     * Retrieve audit logs for a team with pagination
     */
    static async getLogs(teamId, options = {}) {
        const {
            page = 1,
            limit = 50,
            userId,
            action,
            resource,
            startDate,
            endDate
        } = options;

        const offset = (page - 1) * limit;

        let queryArgs = [teamId];
        let whereClause = 'WHERE al.team_id = ?';

        if (userId) {
            whereClause += ' AND al.user_id = ?';
            queryArgs.push(userId);
        }

        if (action) {
            whereClause += ' AND al.action = ?';
            queryArgs.push(action);
        }

        if (resource) {
            whereClause += ' AND al.resource = ?';
            queryArgs.push(resource);
        }

        if (startDate) {
            whereClause += ' AND al.created_at >= ?';
            queryArgs.push(startDate);
        }

        if (endDate) {
            whereClause += ' AND al.created_at <= ?';
            queryArgs.push(endDate);
        }

        const countSql = `SELECT COUNT(*) as total FROM audit_logs al ${whereClause}`;
        const [countRows] = await pool.execute(countSql, queryArgs);
        const total = countRows[0].total;

        queryArgs.push(parseInt(limit), parseInt(offset));

        const sql = `
      SELECT al.*, u.name as user_name, u.email as user_email 
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT ? OFFSET ?
    `;

        const logs = await this.query(sql, queryArgs);

        return {
            data: logs,
            meta: {
                page: parseInt(page),
                limit: parseInt(limit),
                total
            }
        };
    }
}

module.exports = AuditLog;

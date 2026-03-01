const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class InboxMessage {
    /**
     * Run raw queries safely
     */
    static async query(sql, params) {
        const [rows, fields] = await pool.execute(sql, params);
        return rows;
    }

    /**
     * Fetch inbox messages for a team
     */
    static async getMessages(teamId, options = {}) {
        const {
            page = 1,
            limit = 20,
            platform,
            status
        } = options;

        const offset = (page - 1) * limit;

        let queryArgs = [teamId];
        let whereClause = 'WHERE team_id = ?';

        if (platform) {
            whereClause += ' AND platform = ?';
            queryArgs.push(platform);
        }

        if (status) {
            whereClause += ' AND status = ?';
            queryArgs.push(status);
        }

        const countSql = `SELECT COUNT(*) as total FROM inbox_messages ${whereClause}`;
        const [countRows] = await pool.execute(countSql, queryArgs);
        const total = countRows[0].total;

        queryArgs.push(parseInt(limit), parseInt(offset));

        const sql = `
      SELECT * FROM inbox_messages 
      ${whereClause}
      ORDER BY received_at DESC
      LIMIT ? OFFSET ?
    `;

        const messages = await this.query(sql, queryArgs);

        return {
            data: messages,
            meta: {
                page: parseInt(page),
                limit: parseInt(limit),
                total
            }
        };
    }

    /**
     * Change status of a message (e.g., mark read, replied to, etc)
     */
    static async updateStatus(id, teamId, status) {
        const sql = 'UPDATE inbox_messages SET status = ? WHERE id = ? AND team_id = ?';
        await this.query(sql, [status, id, teamId]);
        return true;
    }

    /**
     * Fetch specific message
     */
    static async findById(id, teamId) {
        const rows = await this.query('SELECT * FROM inbox_messages WHERE id = ? AND team_id = ?', [id, teamId]);
        return rows[0];
    }
}

module.exports = InboxMessage;

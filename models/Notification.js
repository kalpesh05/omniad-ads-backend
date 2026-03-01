const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Notification {
    /**
     * Run raw queries safely
     */
    static async query(sql, params) {
        const [rows, fields] = await pool.execute(sql, params);
        return rows;
    }

    /**
     * Fetch paginated list of notifications for a user
     */
    static async getForUser(userId, options = {}) {
        const {
            page = 1,
            limit = 50,
            unreadOnly = false
        } = options;

        const offset = (page - 1) * limit;

        let queryArgs = [userId];
        let whereClause = 'WHERE user_id = ?';

        if (unreadOnly) {
            whereClause += ' AND read_at IS NULL';
        }

        const countSql = `SELECT COUNT(*) as total FROM notifications ${whereClause}`;
        const [countRows] = await pool.execute(countSql, queryArgs);
        const total = countRows[0].total;

        queryArgs.push(parseInt(limit), parseInt(offset));

        const sql = `
      SELECT * FROM notifications 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

        const notifications = await this.query(sql, queryArgs);

        return {
            data: notifications,
            meta: {
                page: parseInt(page),
                limit: parseInt(limit),
                total
            }
        };
    }

    /**
     * Create a new notification
     */
    static async create(data) {
        const { user_id, team_id, type, title, message, action_url } = data;
        const id = uuidv4();

        const sql = `
      INSERT INTO notifications (id, user_id, team_id, type, title, message, action_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

        await this.query(sql, [
            id, user_id, team_id || null, type, title, message || null, action_url || null
        ]);

        return { id, user_id, team_id, type, title, message, action_url };
    }

    /**
     * Mark a single notification as read by its ID
     */
    static async markAsRead(id, userId) {
        const sql = 'UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?';
        await this.query(sql, [id, userId]);
        return true;
    }

    /**
     * Mark all notifications for a specific user as read
     */
    static async markAllAsRead(userId) {
        const sql = 'UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND read_at IS NULL';
        await this.query(sql, [userId]);
        return true;
    }
}

module.exports = Notification;

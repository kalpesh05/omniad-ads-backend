const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class ContentPost {
    /**
     * Run raw queries safely
     */
    static async query(sql, params) {
        const [rows, fields] = await pool.execute(sql, params);
        return rows;
    }

    /**
     * Fetch paginated list of posts for a team
     */
    static async getPosts(teamId, options = {}) {
        const {
            page = 1,
            limit = 50,
            status,
            startDate,
            endDate
        } = options;

        const offset = (page - 1) * limit;

        let queryArgs = [teamId];
        let whereClause = 'WHERE cp.team_id = ?';

        if (status) {
            whereClause += ' AND cp.status = ?';
            queryArgs.push(status);
        }

        if (startDate) {
            whereClause += ' AND cp.scheduled_for >= ?';
            queryArgs.push(startDate);
        }

        if (endDate) {
            whereClause += ' AND cp.scheduled_for <= ?';
            queryArgs.push(endDate);
        }

        const countSql = `SELECT COUNT(*) as total FROM content_posts cp ${whereClause}`;
        const [countRows] = await pool.execute(countSql, queryArgs);
        const total = countRows[0].total;

        queryArgs.push(parseInt(limit), parseInt(offset));

        const sql = `
      SELECT cp.*, u.name as author_name, u.email as author_email 
      FROM content_posts cp
      LEFT JOIN users u ON cp.author_id = u.id
      ${whereClause}
      ORDER BY cp.created_at DESC
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

    /**
     * Fetch calendar view (all posts within a date range)
     */
    static async getCalendar(teamId, startDate, endDate) {
        const sql = `
      SELECT cp.id, cp.title, cp.status, cp.scheduled_for, cp.platforms 
      FROM content_posts cp
      WHERE cp.team_id = ? AND cp.scheduled_for >= ? AND cp.scheduled_for <= ?
      ORDER BY cp.scheduled_for ASC
    `;
        return this.query(sql, [teamId, startDate, endDate]);
    }

    /**
     * Fetch a single post by ID including media
     */
    static async findById(id, teamId) {
        const sql = `
      SELECT cp.*, u.name as author_name 
      FROM content_posts cp
      LEFT JOIN users u ON cp.author_id = u.id
      WHERE cp.id = ? AND cp.team_id = ?
    `;
        const rows = await this.query(sql, [id, teamId]);
        if (rows.length === 0) return null;

        const post = rows[0];

        // Fetch media
        const mediaSql = 'SELECT * FROM content_media WHERE post_id = ?';
        const media = await this.query(mediaSql, [id]);

        post.media = media;
        return post;
    }

    /**
     * Create a new post
     */
    static async create(postData) {
        const { team_id, author_id, title, content, platforms, status = 'draft', scheduled_for } = postData;
        const id = uuidv4();

        const sql = `
      INSERT INTO content_posts (id, team_id, author_id, title, content, platforms, status, scheduled_for)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

        await this.query(sql, [
            id, team_id, author_id, title, content,
            platforms ? JSON.stringify(platforms) : JSON.stringify([]),
            status, scheduled_for || null
        ]);

        return { id, team_id, author_id, title, content, platforms, status, scheduled_for };
    }

    /**
     * Update an existing post
     */
    static async update(id, teamId, updates) {
        let queryArgs = [];
        let setClauses = [];

        const allowedFields = ['title', 'content', 'status', 'scheduled_for'];

        allowedFields.forEach(field => {
            if (updates[field] !== undefined) {
                setClauses.push(`${field} = ?`);
                queryArgs.push(updates[field]);
            }
        });

        if (updates.platforms !== undefined) {
            setClauses.push('platforms = ?');
            queryArgs.push(JSON.stringify(updates.platforms));
        }

        if (setClauses.length === 0) return this.findById(id, teamId);

        queryArgs.push(id, teamId);

        const sql = `UPDATE content_posts SET ${setClauses.join(', ')} WHERE id = ? AND team_id = ?`;
        await this.query(sql, queryArgs);

        return this.findById(id, teamId);
    }

    /**
     * Delete a post
     */
    static async delete(id, teamId) {
        await this.query('DELETE FROM content_posts WHERE id = ? AND team_id = ?', [id, teamId]);
        return true;
    }
}

module.exports = ContentPost;

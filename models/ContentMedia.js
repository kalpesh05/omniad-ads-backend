const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class ContentMedia {
    /**
     * Run raw queries safely
     */
    static async query(sql, params) {
        const [rows, fields] = await pool.execute(sql, params);
        return rows;
    }

    /**
     * Create a new media upload record attached to a post
     */
    static async addMedia(postId, fileData) {
        const { filename, original_name, mime_type, size, url } = fileData;
        const id = uuidv4();

        const sql = `
      INSERT INTO content_media (id, post_id, filename, original_name, mime_type, size, url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

        await this.query(sql, [id, postId, filename, original_name, mime_type, size, url]);
        return { id, post_id: postId, filename, original_name, mime_type, size, url };
    }

    /**
     * Remove media by ID
     */
    static async removeMedia(id) {
        await this.query('DELETE FROM content_media WHERE id = ?', [id]);
        return true;
    }

    /**
     * Gets specific media associated with ID
     */
    static async findById(id) {
        const rows = await this.query('SELECT * FROM content_media WHERE id = ?', [id]);
        return rows[0];
    }
}

module.exports = ContentMedia;

const { pool } = require('../config/database');

class TeamSettings {
    /**
     * Run raw queries safely
     */
    static async query(sql, params) {
        const [rows, fields] = await pool.execute(sql, params);
        return rows;
    }

    /**
     * Get settings for a team
     */
    static async getByTeamId(teamId) {
        const sql = 'SELECT * FROM team_settings WHERE team_id = ?';
        const rows = await this.query(sql, [teamId]);
        return rows[0] || null;
    }

    /**
     * Initialize settings for a newly created team
     */
    static async initializeForTeam(teamId) {
        const sql = `
      INSERT INTO team_settings (team_id, timezone, notification_preferences, auto_publish)
      VALUES (?, 'UTC', ?, FALSE)
    `;
        const defaultPrefs = JSON.stringify({ email_alerts: true, weekly_reports: false });

        await this.query(sql, [teamId, defaultPrefs]);
        return this.getByTeamId(teamId);
    }

    /**
     * Update existing settings
     */
    static async update(teamId, updates) {
        let queryArgs = [];
        let setClauses = [];

        const allowedFields = ['timezone', 'auto_publish'];

        allowedFields.forEach(field => {
            if (updates[field] !== undefined) {
                setClauses.push(`${field} = ?`);
                queryArgs.push(updates[field]);
            }
        });

        if (updates.notification_preferences !== undefined) {
            setClauses.push('notification_preferences = ?');
            queryArgs.push(JSON.stringify(updates.notification_preferences));
        }

        if (setClauses.length === 0) return this.getByTeamId(teamId);

        queryArgs.push(teamId);

        const sql = `UPDATE team_settings SET ${setClauses.join(', ')} WHERE team_id = ?`;
        await this.query(sql, queryArgs);

        return this.getByTeamId(teamId);
    }
}

module.exports = TeamSettings;

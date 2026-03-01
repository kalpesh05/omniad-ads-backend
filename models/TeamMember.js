const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class TeamMember {
    /**
     * Run raw queries safely
     */
    static async query(sql, params) {
        const [rows, fields] = await pool.execute(sql, params);
        return rows;
    }

    /**
     * Get all members of a team
     */
    static async getTeamMembers(teamId) {
        const sql = `
      SELECT tm.id as membership_id, tm.role, tm.invited_at, tm.joined_at, 
             u.id, u.email, u.name, u.username, u.avatar 
      FROM team_members tm
      JOIN users u ON tm.user_id = u.id
      WHERE tm.team_id = ?
    `;
        return this.query(sql, [teamId]);
    }

    /**
     * Check a specific user's membership in a team
     */
    static async getMembership(teamId, userId) {
        const sql = 'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?';
        const rows = await this.query(sql, [teamId, userId]);
        return rows[0];
    }

    /**
     * Add a member to a team (also used for initial owner assignment)
     */
    static async addMember(teamId, userId, role = 'viewer') {
        const id = uuidv4();
        const joinedAt = new Date(); // Automatically assumed joined for simplicity in this flow

        const sql = `
      INSERT INTO team_members (id, team_id, user_id, role, invited_at, joined_at) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;

        await this.query(sql, [id, teamId, userId, role, joinedAt, joinedAt]);
        return { id, teamId, userId, role, joinedAt };
    }

    /**
     * Update a member's role
     */
    static async updateRole(teamId, userId, newRole) {
        const sql = 'UPDATE team_members SET role = ? WHERE team_id = ? AND user_id = ?';
        await this.query(sql, [newRole, teamId, userId]);
        return true;
    }

    /**
     * Remove a member from a team
     */
    static async removeMember(teamId, userId) {
        const sql = 'DELETE FROM team_members WHERE team_id = ? AND user_id = ?';
        await this.query(sql, [teamId, userId]);
        return true;
    }
}

module.exports = TeamMember;

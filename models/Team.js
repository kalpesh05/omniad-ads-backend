const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Team {
    /**
     * Run raw queries safely
     */
    static async query(sql, params) {
        const [rows, fields] = await pool.execute(sql, params);
        return rows;
    }

    /**
     * Find a team by its ID
     */
    static async findById(id) {
        const rows = await this.query('SELECT * FROM teams WHERE id = ?', [id]);
        return rows[0];
    }

    /**
     * Find all teams owned by a specific user
     */
    static async findByOwner(userId) {
        return this.query('SELECT * FROM teams WHERE owner_id = ?', [userId]);
    }

    /**
     * Find teams a user belongs to (either owner or invited member)
     */
    static async findUserTeams(userId) {
        const query = `
      SELECT t.id, t.name, t.slug, t.owner_id, t.plan, t.settings, t.created_at, tm.role 
      FROM teams t 
      JOIN team_members tm ON t.id = tm.team_id 
      WHERE tm.user_id = ?
    `;
        return this.query(query, [userId]);
    }

    /**
     * Ensure slug is unique, or generate a numbered variant
     */
    static async getUniqueSlug(baseSlug) {
        let slug = baseSlug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        let counter = 1;

        while (true) {
            const currentSlug = counter === 1 ? slug : `${slug}-${counter}`;
            const rows = await this.query('SELECT id FROM teams WHERE slug = ?', [currentSlug]);

            if (rows.length === 0) {
                return currentSlug; // Available!
            }
            counter++;
        }
    }

    /**
     * Create a new team
     */
    static async create(teamData) {
        const { name, owner_id, plan = 'free' } = teamData;
        let { slug } = teamData;

        // Generate UUID for team
        const id = uuidv4();

        // Auto-generate or validate slug
        if (!slug) {
            slug = await this.getUniqueSlug(name);
        } else {
            const rows = await this.query('SELECT id FROM teams WHERE slug = ?', [slug]);
            if (rows.length > 0) throw new Error('Slug already exists');
        }

        const settings = JSON.stringify({});

        // Create the team
        await this.query(
            'INSERT INTO teams (id, name, slug, owner_id, plan, settings) VALUES (?, ?, ?, ?, ?, ?)',
            [id, name, slug, owner_id, plan, settings]
        );

        return {
            id,
            name,
            slug,
            owner_id,
            plan,
            settings: {}
        };
    }

    /**
     * Update a team
     */
    static async update(id, updates) {
        let queryArgs = [];
        let setClauses = [];

        if (updates.name) {
            setClauses.push('name = ?');
            queryArgs.push(updates.name);
        }

        if (updates.slug) {
            setClauses.push('slug = ?');
            queryArgs.push(updates.slug);
        }

        if (updates.settings) {
            setClauses.push('settings = ?');
            queryArgs.push(JSON.stringify(updates.settings));
        }

        if (setClauses.length === 0) return null;

        queryArgs.push(id);
        const sql = `UPDATE teams SET ${setClauses.join(', ')} WHERE id = ?`;
        await this.query(sql, queryArgs);

        return this.findById(id);
    }

    /**
     * Delete a team
     */
    static async delete(id) {
        await this.query('DELETE FROM teams WHERE id = ?', [id]);
        return true;
    }
}

module.exports = Team;

const { pool } = require('../config/database');

// for selected_properties table
class PropertySelector {
    constructor(data) {
        this.id = data.id;
        this.user_id = data.user_id;
        this.property_id = data.property_id;
    }

    static async upsert({ user_id, property_id }) {
        const [rows] = await pool.execute(
            `INSERT INTO selected_properties (user_id, property_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE user_id = ?, property_id = ?`,
            [user_id, property_id, user_id, property_id]
        );
        return await PropertySelector.findByUserAndProperty(user_id, property_id);
    }

    static async findById(id) {
        const [rows] = await pool.execute(
            `SELECT * FROM selected_properties WHERE id = ?`,
            [id]
        );
        if (rows.length > 0) {
            const data = rows[0];
            return new PropertySelector(data);
        }
        return null;
    }

    static async findByUserAndProperty(user_id, property_id) {
        const [rows] = await pool.execute(
            `SELECT * FROM selected_properties WHERE user_id = ? AND property_id = ?`,
            [user_id, property_id]
        );
        if (rows.length > 0) {
            const data = rows[0];
            return new PropertySelector(data);
        }
        return null;
    }

    static async findByUser(user_id) {
        const [rows] = await pool.execute(
            `SELECT * FROM selected_properties WHERE user_id = ?`,
            [user_id]
        );
        if (rows.length > 0) {
            const data = rows[0];
            return new PropertySelector(data);
        }
        return null;
    }


}

module.exports = PropertySelector;
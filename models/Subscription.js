const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Subscription {
    /**
     * Run raw queries safely
     */
    static async query(sql, params) {
        const [rows, fields] = await pool.execute(sql, params);
        return rows;
    }

    /**
     * Get subscription details for a team
     */
    static async getByTeamId(teamId) {
        const sql = 'SELECT * FROM subscriptions WHERE team_id = ?';
        const rows = await this.query(sql, [teamId]);
        return rows[0] || null;
    }

    /**
     * Get subscription by Stripe Subscription ID
     */
    static async findByStripeSubscriptionId(subId) {
        const sql = 'SELECT * FROM subscriptions WHERE stripe_subscription_id = ?';
        const rows = await this.query(sql, [subId]);
        return rows[0] || null;
    }

    /**
     * Create an initial subscription for a team (called during team creation usually)
     * Implements a 1-week trial period starting from creation.
     */
    static async createForTeam(teamId) {
        const id = uuidv4();

        // Set trial end date to 7 days from now
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + 7);

        const sql = `
      INSERT INTO subscriptions (id, team_id, plan_id, status, trial_ends_at)
      VALUES (?, ?, 'free', 'trialing', ?)
    `;

        await this.query(sql, [id, teamId, trialEndsAt]);
        return this.getByTeamId(teamId);
    }

    /**
     * Update Stripe billing details (webhook hooks into this)
     */
    static async updateStripeInfo(teamId, stripeData) {
        const {
            plan_id,
            status,
            stripe_customer_id,
            stripe_subscription_id,
            billing_interval,
            current_period_end,
            cancel_at_period_end
        } = stripeData;

        let queryArgs = [];
        let setClauses = [];

        const allowedFields = {
            plan_id, status, stripe_customer_id, stripe_subscription_id, billing_interval, current_period_end, cancel_at_period_end
        };

        for (const [key, value] of Object.entries(allowedFields)) {
            if (value !== undefined) {
                setClauses.push(`${key} = ?`);
                queryArgs.push(value);
            }
        }

        if (setClauses.length === 0) return this.getByTeamId(teamId);

        queryArgs.push(teamId);

        const sql = `UPDATE subscriptions SET ${setClauses.join(', ')} WHERE team_id = ?`;
        await this.query(sql, queryArgs);

        return this.getByTeamId(teamId);
    }
}

module.exports = Subscription;

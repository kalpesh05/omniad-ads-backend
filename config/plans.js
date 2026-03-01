// Defines the subscription tiers and their respective limits.
// Prices can be fetched dynamically from Stripe, but limits are defined here.

const PLANS = {
    free: {
        id: 'free',
        name: 'Free Trial (1 Week)',
        product_id: null, // No stripe product needed for free tier usually
        limits: {
            team_members: 1,
            campaigns_per_month: 2,
            posts_per_month: 10,
            storage_mb: 50 // 50 MB
        }
    },
    starter: {
        id: 'starter',
        name: 'Starter',
        product_id: 'prod_starter_placeholder',
        prices: {
            monthly: 'price_starter_monthly_placeholder',
            yearly: 'price_starter_yearly_placeholder'
        },
        limits: {
            team_members: 3,
            campaigns_per_month: 10,
            posts_per_month: 50,
            storage_mb: 500 // 500 MB
        }
    },
    pro: {
        id: 'pro',
        name: 'Pro',
        product_id: 'prod_pro_placeholder',
        prices: {
            monthly: 'price_pro_monthly_placeholder',
            yearly: 'price_pro_yearly_placeholder'
        },
        limits: {
            team_members: 10,
            campaigns_per_month: 50,
            posts_per_month: 500,
            storage_mb: 5000 // 5 GB
        }
    },
    enterprise: {
        id: 'enterprise',
        name: 'Enterprise',
        product_id: 'prod_enterprise_placeholder',
        prices: {
            monthly: 'price_ent_monthly_placeholder',
            yearly: 'price_ent_yearly_placeholder'
        },
        limits: {
            team_members: -1, // Unlimited
            campaigns_per_month: -1, // Unlimited
            posts_per_month: -1, // Unlimited
            storage_mb: 50000 // 50 GB
        }
    }
};

/**
 * Helper to determine which plan ID corresponds to a given Stripe Price ID
 */
const getPlanByPriceId = (priceId) => {
    for (const [planId, planObj] of Object.entries(PLANS)) {
        if (planObj.prices) {
            if (planObj.prices.monthly === priceId || planObj.prices.yearly === priceId) {
                return planObj;
            }
        }
    }
    return PLANS.free; // Default fallback
};

/**
 * Helper to determine if a price ID is yearly
 */
const isYearlyPrice = (priceId) => {
    for (const planObj of Object.values(PLANS)) {
        if (planObj.prices && planObj.prices.yearly === priceId) {
            return true;
        }
    }
    return false;
};

module.exports = {
    PLANS,
    getPlanByPriceId,
    isYearlyPrice
};

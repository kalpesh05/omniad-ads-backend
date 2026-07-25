const Subscription = require('../models/Subscription');
const AuditLog = require('../models/AuditLog');
const { getPlanByPriceId, isYearlyPrice } = require('../config/plans');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

exports.getPlan = async (req, res) => {
    try {
        const { teamId } = req.query;
        if (!teamId) return res.status(400).json({ success: false, message: 'teamId is required' });

        const subscription = await Subscription.getByTeamId(teamId);

        if (!subscription) {
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Subscription record not found' } });
        }

        // Determine Trial Validity
        const now = new Date();
        let isTrialActive = false;
        let daysLeftInTrial = 0;

        if (subscription.trial_ends_at && new Date(subscription.trial_ends_at) > now) {
            isTrialActive = true;
            const diffTime = Math.abs(new Date(subscription.trial_ends_at) - now);
            daysLeftInTrial = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        // Map hardcoded limits and details onto the response
        const planConfig = getPlanByPriceId(subscription.plan_id); // we default to 'free' or parse the id
        const mappedPlanId = Object.keys(require('../config/plans').PLANS).includes(subscription.plan_id) ? subscription.plan_id : 'free';
        const fullPlanLimits = require('../config/plans').PLANS[mappedPlanId];

        res.status(200).json({
            success: true,
            data: {
                ...subscription,
                isTrialActive,
                daysLeftInTrial,
                tier: fullPlanLimits
            }
        });
    } catch (error) {
        console.error('Error fetching billing plan:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch plan details' } });
    }
};

exports.createCheckout = async (req, res) => {
    try {
        const { teamId, priceId } = req.body;
        if (!teamId || !priceId) {
            return res.status(400).json({ success: false, message: 'teamId and priceId are required' });
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'subscription',
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings/billing?canceled=true`,
            client_reference_id: teamId,
        });

        await AuditLog.logAction(req, teamId, 'billing.checkout_started', 'subscription', teamId, `Started checkout for ${priceId}`);

        res.status(200).json({ success: true, url: session.url });
    } catch (error) {
        console.error('Stripe checkout error:', error);
        res.status(500).json({ success: false, error: { code: 'STRIPE_ERROR', message: 'Failed to create checkout session' } });
    }
};

// Stripe Webhook handler needs to parse raw body
exports.handleWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_placeholder';
    let event;

    try {
        // Note: req.body MUST be raw buffer for Stripe signature verification
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                const teamId = session.client_reference_id;
                if (!teamId) break;

                const subscriptionId = session.subscription;
                const customerId = session.customer;

                // Retrieve subscription details to get plan id/period
                const subDetails = await stripe.subscriptions.retrieve(subscriptionId);

                // Parse price id to plan id
                const priceId = subDetails.items.data[0].price.id;
                const mappedPlan = getPlanByPriceId(priceId);
                const interval = isYearlyPrice(priceId) ? 'yearly' : 'monthly';

                await Subscription.updateStripeInfo(teamId, {
                    plan_id: mappedPlan.id,
                    status: subDetails.status,
                    stripe_customer_id: customerId,
                    stripe_subscription_id: subscriptionId,
                    billing_interval: interval,
                    current_period_end: new Date(subDetails.current_period_end * 1000),
                    cancel_at_period_end: subDetails.cancel_at_period_end
                });

                // Use a generic "system" request block since there's no normal req.user in a webhook
                const mockReq = { ip: req.ip, headers: { 'user-agent': 'Stripe/Webhook' }, user: { id: null } };
                await AuditLog.logAction(mockReq, teamId, 'billing.subscription_created', 'subscription', subscriptionId);
                break;
            }
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted': {
                const subscription = event.data.object;

                // Lookup team by stripe_subscription_id internally 
                // Or if you passed teamId in metadata you can use that
                const teamId = subscription.metadata.teamId || null; // Requires you to pass metadata
                if (teamId) {
                    await Subscription.updateStripeInfo(teamId, {
                        status: subscription.status,
                        current_period_end: new Date(subscription.current_period_end * 1000),
                        cancel_at_period_end: subscription.cancel_at_period_end
                    });

                    const mockReq = { ip: req.ip, headers: { 'user-agent': 'Stripe/Webhook' }, user: { id: null } };
                    await AuditLog.logAction(mockReq, teamId, 'billing.subscription_updated', 'subscription', subscription.id);
                }
                break;
            }
            case 'invoice.payment_failed':
            case 'invoice.payment_action_required': {
                const invoice = event.data.object;
                const subscriptionId = invoice.subscription;
                if (!subscriptionId) break;

                const subRecord = await Subscription.findByStripeSubscriptionId(subscriptionId);
                if (subRecord && subRecord.team_id) {
                    const mockReq = { ip: req.ip, headers: { 'user-agent': 'Stripe/Webhook' }, user: { id: null } };

                    // Parse Reason if any
                    const failReason = invoice.last_payment_error ? invoice.last_payment_error.message : 'Automatic payment failed or requires action';

                    await AuditLog.logAction(mockReq, subRecord.team_id, 'billing.payment_failed', 'subscription', subscriptionId, failReason);

                    // Notify workspace owners
                    const TeamMember = require('../models/TeamMember');
                    const Notification = require('../models/Notification');
                    const members = await TeamMember.getTeamMembers(subRecord.team_id);
                    const owners = members.filter(m => m.role === 'owner' || m.role === 'admin');

                    for (const owner of owners) {
                        await Notification.create({
                            user_id: owner.id,
                            team_id: subRecord.team_id,
                            type: 'billing_alert',
                            title: 'Payment Failed',
                            message: `Your recent subscription payment failed: ${failReason}. Please update your billing details to prevent service interruption.`,
                            action_url: '/settings/billing'
                        });

                        // Make-believe email hook here
                        console.log(`[EMAIL DISPATCH] To: ${owner.email} | Subject: Action Required - Payment Failed | Body: ${failReason}`);
                    }
                }
                break;
            }
            case 'invoice.upcoming': {
                // Fired a few days before a subscription renews OR if a card is expiring soon
                const invoice = event.data.object;
                const subscriptionId = invoice.subscription;
                if (!subscriptionId) break;

                const subRecord = await Subscription.findByStripeSubscriptionId(subscriptionId);
                if (subRecord && subRecord.team_id) {
                    const TeamMember = require('../models/TeamMember');
                    const Notification = require('../models/Notification');
                    const members = await TeamMember.getTeamMembers(subRecord.team_id);
                    const owners = members.filter(m => m.role === 'owner' || m.role === 'admin');

                    for (const owner of owners) {
                        await Notification.create({
                            user_id: owner.id,
                            team_id: subRecord.team_id,
                            type: 'billing_alert',
                            title: 'Upcoming Subscription Renewal',
                            message: 'Your workspace subscription will renew soon. Please ensure your payment method is up to date.',
                            action_url: '/settings/billing'
                        });

                        console.log(`[EMAIL DISPATCH] To: ${owner.email} | Subject: Upcoming Renewal | Body: Ensure card details are valid.`);
                    }
                }
                break;
            }
            default:
                console.log(`Unhandled event type ${event.type}`);
        }

        res.json({ received: true });
    } catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
};

const prisma = require('../config/prisma');
const { successResponse, errorResponse } = require('../utils/response');

exports.getClientInvoices = async (req, res) => {
    try {
        const teamId = req.query.teamId;
        if (!teamId) return errorResponse(res, 'teamId required', 400);

        const invoices = await prisma.client_invoices.findMany({
            where: { team_id: teamId },
            orderBy: { created_at: 'desc' }
        });

        successResponse(res, invoices, 'Client invoices retrieved successfully');
    } catch (error) {
        console.error('Error fetching client invoices:', error);
        errorResponse(res, 'Failed to fetch client invoices');
    }
};

exports.generateClientInvoice = async (req, res) => {
    try {
        const { teamId, clientEmail, amount } = req.body;
        if (!teamId || !clientEmail || !amount) {
            return errorResponse(res, 'teamId, clientEmail, and amount required', 400);
        }

        const settings = await prisma.team_settings.findUnique({
            where: { team_id: teamId }
        });

        if (!settings || !settings.stripe_api_key) {
            return errorResponse(res, 'Agency Stripe API keys not configured.', 400);
        }

        // Initialize Stripe with Agency's key (Option B: BYOS)
        const agencyStripe = require('stripe')(settings.stripe_api_key);

        // 1. Find or create customer on Agency's Stripe
        let customers = await agencyStripe.customers.list({ email: clientEmail, limit: 1 });
        let customer;
        if (customers.data.length === 0) {
            customer = await agencyStripe.customers.create({ email: clientEmail });
        } else {
            customer = customers.data[0];
        }

        // 2. Create an Invoice Item for the Ad Spend + Management Fee
        await agencyStripe.invoiceItems.create({
            customer: customer.id,
            amount: Math.round(amount * 100), // Stripe uses cents
            currency: 'usd',
            description: 'AI Autonomous Ad Management & Spend (OmniAds)',
        });

        // 3. Generate the Invoice
        const invoice = await agencyStripe.invoices.create({
            customer: customer.id,
            auto_advance: true,
            collection_method: 'send_invoice',
            days_until_due: 7,
        });

        // 4. Save to our database for the ClientBilling.tsx dashboard
        const clientInvoice = await prisma.client_invoices.create({
            data: {
                team_id: teamId,
                client_email: clientEmail,
                amount: amount,
                status: invoice.status || 'open',
                stripe_inv_id: invoice.id,
                period_start: new Date(),
                period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            }
        });

        successResponse(res, clientInvoice, 'Invoice generated successfully via Agency Stripe account');
    } catch (error) {
        console.error('Error generating client invoice:', error);
        errorResponse(res, 'Failed to generate client invoice. Verify Stripe API keys.');
    }
};

exports.getMRR = async (req, res) => {
    try {
        const teamId = req.user.team_id || req.query.teamId || 1; // Basic fallback

        const team = await prisma.teams.findUnique({
            where: { id: parseInt(teamId) }
        });

        let isStripeConnected = false;
        let stripeSecretKey = null;

        if (team && team.settings) {
            const settings = typeof team.settings === 'string' ? JSON.parse(team.settings) : team.settings;
            if (settings.stripe_secret_key) {
                stripeSecretKey = settings.stripe_secret_key;
                isStripeConnected = true;
            }
        }

        if (!isStripeConnected || !stripeSecretKey) {
            return res.status(200).json({
                success: true,
                data: {
                    mrr: 0,
                    activeClients: 0,
                    churnRate: 0,
                    isStripeConnected: false
                }
            });
        }

        const customStripe = require('stripe')(stripeSecretKey);
        
        // Fetch real subscriptions from the agency's connected Stripe account
        const subscriptions = await customStripe.subscriptions.list({ status: 'active', limit: 100 });
        
        let mrr = 0;
        let activeClients = subscriptions.data.length;

        subscriptions.data.forEach(sub => {
            const amount = sub.items.data[0].price.unit_amount;
            const interval = sub.items.data[0].price.recurring.interval;
            if (interval === 'month') mrr += amount;
            if (interval === 'year') mrr += (amount / 12);
        });

        mrr = mrr / 100;

        res.status(200).json({
            success: true,
            data: {
                mrr: mrr.toFixed(2),
                activeClients,
                churnRate: "2.4%", // Mock churn rate for UI purposes
                isStripeConnected: true
            }
        });
    } catch (error) {
        console.error('Error fetching MRR:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch MRR from Stripe' });
    }
};

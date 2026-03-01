const Team = require('../models/Team');
const TeamMember = require('../models/TeamMember');
const AuditLog = require('../models/AuditLog');
const Subscription = require('../models/Subscription');
const TeamSettings = require('../models/TeamSettings');
const { getPlanByPriceId } = require('../config/plans');
const { validationResult } = require('express-validator');

exports.getTeams = async (req, res) => {
    try {
        const userId = req.user.id;
        const teams = await Team.findUserTeams(userId);

        // Format to match documented response
        const formattedTeams = teams.map(t => ({
            id: t.id,
            name: t.name,
            slug: t.slug,
            ownerId: t.owner_id,
            plan: t.plan,
            memberCount: t.memberCount || 1, // Optional: normally would run a count query
            createdAt: t.created_at
        }));

        res.status(200).json({
            success: true,
            data: formattedTeams
        });
    } catch (error) {
        console.error('Error fetching teams:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch teams' } });
    }
};

exports.createTeam = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: errors.array() }
            });
        }

        const { name, slug } = req.body;
        const userId = req.user.id;

        const newTeam = await Team.create({ name, slug, owner_id: userId });

        // Automatically add creator as admin
        await TeamMember.addMember(newTeam.id, userId, 'admin');

        // Initialize Settings and 1-Week Trial Subscription
        await TeamSettings.initializeForTeam(newTeam.id);
        const sub = await Subscription.createForTeam(newTeam.id);

        // Audit log
        await AuditLog.logAction(req, newTeam.id, 'team.created', 'team', newTeam.id, newTeam.name);

        res.status(201).json({
            success: true,
            data: {
                id: newTeam.id,
                name: newTeam.name,
                slug: newTeam.slug,
                ownerId: newTeam.owner_id,
                plan: sub ? sub.plan_id : newTeam.plan,
                trialEndsAt: sub ? sub.trial_ends_at : null,
                createdAt: new Date().toISOString()
            },
            message: 'Team created successfully'
        });
    } catch (error) {
        console.error('Error creating team:', error);
        if (error.message === 'Slug already exists') {
            return res.status(409).json({ success: false, error: { code: 'CONFLICT', message: 'Team slug already exists' } });
        }
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create team' } });
    }
};

exports.inviteMember = async (req, res) => {
    try {
        const { teamId } = req.params;
        const { email, role } = req.body;

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: errors.array() } });
        }

        // Verify requester has permission (handled by generic middleware usually, but good to check)
        const membership = await TeamMember.getMembership(teamId, req.user.id);
        if (!membership || !['admin', 'manager'].includes(membership.role)) {
            return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
        }

        // Lookup user by email
        const [users] = await Team.query('SELECT id FROM users WHERE email = ?', [email]);
        if (!users || users.length === 0) {
            // In a real app, you might send an email invitation to non-users here
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found in system' } });
        }

        const newMemberId = users[0].id;

        // Check if already a member
        const existing = await TeamMember.getMembership(teamId, newMemberId);
        if (existing) {
            return res.status(409).json({ success: false, error: { code: 'CONFLICT', message: 'User is already a team member' } });
        }

        // Enforce membership limits
        const subscription = await Subscription.getByTeamId(teamId);
        // Block invites on premium plans if they are past_due / failed
        const isActive = subscription && ['active', 'trialing'].includes(subscription.status);
        const planTier = isActive ? subscription.plan_id : 'free';

        let planConfig;
        try {
            planConfig = getPlanByPriceId(planTier);
        } catch (e) {
            planConfig = require('../config/plans').PLANS['free'];
        }

        const memberLimit = planConfig.limits.team_members;

        if (memberLimit !== -1) {
            const [countData] = await Team.query(
                `SELECT COUNT(*) as currentMembers FROM team_members WHERE team_id = ?`,
                [teamId]
            );

            if (countData.currentMembers >= memberLimit) {
                return res.status(402).json({
                    success: false,
                    error: {
                        code: 'PAYMENT_REQUIRED',
                        message: `Seat limit of ${memberLimit} reached for your ${planConfig.name} plan. Please upgrade to add more team members.`
                    }
                });
            }
        }

        await TeamMember.addMember(teamId, newMemberId, role);
        await AuditLog.logAction(req, teamId, 'team.member_invited', 'team_member', newMemberId, email, { role });

        res.status(200).json({
            success: true,
            message: `Invitation sent to ${email}`
        });
    } catch (error) {
        console.error('Error inviting member:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to invite member' } });
    }
};

exports.updateMemberRole = async (req, res) => {
    try {
        const { teamId, userId } = req.params;
        const { role } = req.body;

        const membership = await TeamMember.getMembership(teamId, req.user.id);
        if (!membership || membership.role !== 'admin') {
            return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only admins can change roles' } });
        }

        if (req.user.id.toString() === userId.toString()) {
            return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Cannot change your own role' } });
        }

        await TeamMember.updateRole(teamId, userId, role);
        await AuditLog.logAction(req, teamId, 'team.role_changed', 'team_member', userId, null, { newRole: role });

        res.status(200).json({ success: true, message: `Member role updated to ${role}` });
    } catch (error) {
        console.error('Error updating member role:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update member role' } });
    }
};

exports.removeMember = async (req, res) => {
    try {
        const { teamId, userId } = req.params;

        const membership = await TeamMember.getMembership(teamId, req.user.id);

        // Can only remove if you are an admin OR you are removing yourself
        if (req.user.id.toString() !== userId.toString() && (!membership || membership.role !== 'admin')) {
            return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
        }

        await TeamMember.removeMember(teamId, userId);
        await AuditLog.logAction(req, teamId, 'team.member_removed', 'team_member', userId, null);

        res.status(200).json({ success: true, message: 'Member removed from team' });
    } catch (error) {
        console.error('Error removing member:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to remove member' } });
    }
};

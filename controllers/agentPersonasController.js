const prisma = require('../config/prisma');
const { successResponse, errorResponse } = require('../utils/response');

exports.getPersonas = async (req, res) => {
    try {
        const teamId = req.query.teamId;
        if (!teamId) return errorResponse(res, 'teamId required', 400);

        const personas = await prisma.agent_personas.findMany({
            where: { team_id: teamId }
        });
        successResponse(res, personas, 'Personas retrieved');
    } catch (error) {
        errorResponse(res, 'Failed to retrieve personas');
    }
};

exports.hirePersona = async (req, res) => {
    try {
        const { teamId, name, specialty, system_prompt } = req.body;
        if (!teamId || !name) return errorResponse(res, 'teamId and name required', 400);

        const persona = await prisma.agent_personas.create({
            data: {
                team_id: teamId,
                name,
                specialty: specialty || 'Generalist',
                system_prompt: system_prompt || 'You are an AI Media Buyer.',
                is_active: true
            }
        });
        successResponse(res, persona, 'Persona hired successfully');
    } catch (error) {
        errorResponse(res, 'Failed to hire persona');
    }
};

const { successResponse, errorResponse } = require('../utils/response');

exports.generateBriefing = async (req, res) => {
    try {
        const { teamId, clientId, month } = req.body;
        
        // Simulate a 3rd party AI Voice/Video generation API (e.g. ElevenLabs, HeyGen)
        setTimeout(() => {
            const mockBriefingUrl = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
            
            successResponse(res, {
                url: mockBriefingUrl,
                transcript: "Hi there. Here is your AI generated summary for last month. Your campaigns generated 42 new leads at a cost per acquisition of $14.50. We shifted budget towards TikTok which resulted in a 20% increase in ROAS."
            }, 'AI Media Briefing generated successfully');
        }, 3000); // Simulate processing time

    } catch (error) {
        errorResponse(res, 'Failed to generate AI media briefing');
    }
};

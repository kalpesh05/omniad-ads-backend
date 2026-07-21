const prisma = require('../config/prisma');
const aiService = require('./aiService');
const cron = require('node-cron');

class AgentManager {
  /**
   * Initializes background cron jobs for the Agent.
   * This should be called once when the server starts.
   */
  startCronJobs() {
    // Run budget analysis every day at 8:00 AM
    cron.schedule('0 8 * * *', async () => {
      console.log('[AgentManager] Starting daily autonomous campaign analysis...');
      try {
        await this.runAnalysisForAllTeams();
      } catch (error) {
        console.error('[AgentManager] Error during daily analysis:', error);
      }
    });
    console.log('✅ AgentManager CRON jobs scheduled.');
  }

  /**
   * Iterates through all active teams and runs the AI analysis on their active campaigns
   */
  async runAnalysisForAllTeams() {
    const teams = await prisma.teams.findMany({
      include: {
        ads_campaigns: {
          where: { status: 'ACTIVE' },
          include: {
            ads_insights: {
              orderBy: { date: 'desc' },
              take: 7 // Last 7 days of insights
            },
            ads_accounts: {
              include: {
                ads_tokens: true
              }
            }
          }
        }
      }
    });

    for (const team of teams) {
      if (team.ads_campaigns.length === 0) continue;

      for (const campaign of team.ads_campaigns) {
        if (campaign.ads_insights.length === 0) continue;
        
        await this.analyzeCampaign(team.id, campaign);
      }
    }
  }

  /**
   * Analyzes a single campaign and proposes actions if necessary
   */
  async analyzeCampaign(teamId, campaign) {
    const insightsSummary = campaign.ads_insights.map(i => ({
      date: i.date.toISOString().split('T')[0],
      spend: parseFloat(i.spend || 0),
      clicks: i.clicks || 0,
      impressions: i.impressions || 0,
      conversions: i.conversions || 0,
      revenue: parseFloat(i.revenue || 0)
    }));

    // Calculate total spend and revenue for ROAS
    const totalSpend = insightsSummary.reduce((sum, i) => sum + i.spend, 0);
    const totalRevenue = insightsSummary.reduce((sum, i) => sum + i.revenue, 0);
    const roas = totalSpend > 0 ? (totalRevenue / totalSpend).toFixed(2) : 0;

    const prompt = `
You are an autonomous AI media buyer. Analyze the following 7-day performance for campaign "${campaign.campaign_name}" (ID: ${campaign.campaign_id}).
Total Spend: $${totalSpend.toFixed(2)}
Total Revenue: $${totalRevenue.toFixed(2)}
ROAS: ${roas}

Daily Breakdown:
${JSON.stringify(insightsSummary, null, 2)}

Determine if an action needs to be taken. 
Possible actions:
1. "pause_campaign" (if spend is high and conversions/ROAS are extremely low or 0).
2. "shift_budget" (if performance is good and we should increase budget, or bad but not awful).
3. "none" (if performance is acceptable and stable).

Return your decision as a valid JSON object exactly like this:
{
  "action_type": "pause_campaign" | "shift_budget" | "none",
  "reasoning": "A short, persuasive explanation of why you recommend this action.",
  "proposed_data": { "new_budget": 100 } // optional, depending on action
}
Do not include any markdown formatting, just the raw JSON object.
`;

    try {
      const rawResponse = await aiService._generateCompletion(prompt, 'gemini'); // Using gemini for cost-efficiency in background
      const startIdx = rawResponse.indexOf('{');
      const endIdx = rawResponse.lastIndexOf('}') + 1;
      const decision = JSON.parse(rawResponse.substring(startIdx, endIdx));

      if (decision.action_type && decision.action_type !== 'none') {
        const platform = campaign.ads_accounts?.ads_tokens?.platform || 'facebook'; // fallback
        
        // Create a proposal for the user to approve
        await prisma.agent_proposals.create({
          data: {
            team_id: teamId,
            platform: platform,
            campaign_id: campaign.campaign_id,
            action_type: decision.action_type,
            reasoning: decision.reasoning,
            proposed_data: JSON.stringify(decision.proposed_data || {}),
            status: 'pending'
          }
        });
        console.log(`[AgentManager] Proposal created for campaign ${campaign.campaign_name}`);
      }
    } catch (error) {
      console.error(`[AgentManager] Failed to analyze campaign ${campaign.campaign_id}:`, error.message);
    }
  }
}

module.exports = new AgentManager();

/**
 * Automated Creative Fatigue Alert Engine
 * 
 * Monitors active ad creatives for frequency spikes, CTR decay, and fatigue scores.
 * Dispatches real-time Slack Block Kit alerts and custom webhooks (Zapier, Discord, Make).
 */

const axios = require('axios');
const CreativeIntelligenceService = require('./creativeIntelligenceService');

// In-memory configuration store by team ID
const teamAlertConfigs = new Map();

const DEFAULT_CONFIG = {
  slack_enabled: false,
  slack_webhook_url: '',
  webhook_enabled: false,
  custom_webhook_url: '',
  alert_channel: 'slack', // 'slack' | 'webhook' | 'both'
  min_fatigue_score: 65,
  frequency_threshold: 3.2,
  ctr_decay_threshold: 20, // 20% drop
  auto_draft_pause: true,
  notify_on_warning: true,
  notify_on_fatigued: true
};

class FatigueAlertService {
  /**
   * Get team alert settings
   */
  static getSettings(teamId) {
    if (!teamAlertConfigs.has(teamId)) {
      teamAlertConfigs.set(teamId, { ...DEFAULT_CONFIG });
    }
    return teamAlertConfigs.get(teamId);
  }

  /**
   * Update team alert settings
   */
  static updateSettings(teamId, updates) {
    const current = this.getSettings(teamId);
    const updated = {
      ...current,
      ...updates
    };
    teamAlertConfigs.set(teamId, updated);
    return updated;
  }

  /**
   * Build high-fidelity Slack Block Kit payload
   */
  static buildSlackBlockKit(creative, teamName = 'Growth Agency') {
    const isSevere = creative.fatigueStatus === 'fatigued' || creative.fatigueScore >= 80;
    const alertEmoji = isSevere ? '🚨' : '⚠️';
    const statusText = isSevere ? '*SEVERE CREATIVE FATIGUE*' : '*CREATIVE FATIGUE WARNING*';
    const roasDisplay = creative.roas ? `${creative.roas.toFixed(2)}x` : 'N/A';

    return {
      text: `${alertEmoji} [${teamName}] Creative Fatigue Alert: ${creative.adName}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${alertEmoji} Creative Fatigue Alert • ${creative.platform}`,
            emoji: true
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Ad Name:* ${creative.adName}\n*Campaign:* ${creative.campaignName}\n*Status:* ${statusText}`
          },
          ...(creative.thumbnailUrl ? {
            accessory: {
              type: 'image',
              image_url: creative.thumbnailUrl,
              alt_text: 'Ad creative thumbnail'
            }
          } : {})
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Fatigue Score:*\n\`${creative.fatigueScore}/100\` ${creative.fatigueScore >= 80 ? '🔴' : '🟡'}`
            },
            {
              type: 'mrkdwn',
              text: `*Ad Frequency:*\n\`${creative.frequency}x\` (High)`
            },
            {
              type: 'mrkdwn',
              text: `*Current ROAS:*\n\`${roasDisplay}\``
            },
            {
              type: 'mrkdwn',
              text: `*Spend to Date:*\n\`$${creative.spend?.toLocaleString() || '0'}\``
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*🧠 AI Algorithmic Diagnosis:*\n_${creative.diagnosis}_`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*💡 Prescribed Agency Action:*\n*${creative.recommendedAction}*`
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '🚀 Open in Creative Studio',
                emoji: true
              },
              style: 'primary',
              url: 'http://localhost:5173/dashboard/creative'
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Pause Ad (Draft)',
                emoji: true
              },
              style: 'danger',
              value: `pause_${creative.id}`
            }
          ]
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `OmniHub Creative Intelligence • Automated Alert Generated at ${new Date().toLocaleTimeString()} UTC`
            }
          ]
        }
      ]
    };
  }

  /**
   * Dispatch Slack webhook
   */
  static async sendSlack(webhookUrl, blockPayload) {
    if (!webhookUrl || !webhookUrl.startsWith('http')) {
      throw new Error('Invalid Slack webhook URL');
    }
    const response = await axios.post(webhookUrl, blockPayload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 8000
    });
    return response.data;
  }

  /**
   * Dispatch custom webhook (Discord / Zapier / Make / n8n)
   */
  static async sendCustomWebhook(webhookUrl, eventData) {
    if (!webhookUrl || !webhookUrl.startsWith('http')) {
      throw new Error('Invalid custom webhook URL');
    }
    const response = await axios.post(webhookUrl, {
      event: 'CREATIVE_FATIGUE_ALERT',
      timestamp: new Date().toISOString(),
      ...eventData
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 8000
    });
    return response.data;
  }

  /**
   * Scan active creatives for a team and broadcast alerts for fatigued assets
   */
  static async scanAndDispatch(teamId) {
    const config = this.getSettings(teamId);
    const creatives = await CreativeIntelligenceService.getCreativeLeaderboard(teamId);

    // Identify creatives meeting fatigue criteria
    const fatiguedCreatives = creatives.filter(cr => {
      if (cr.fatigueStatus === 'fatigued' && config.notify_on_fatigued) return true;
      if (cr.fatigueStatus === 'warning' && config.notify_on_warning) return true;
      if (cr.fatigueScore >= config.min_fatigue_score) return true;
      if (cr.frequency >= config.frequency_threshold) return true;
      return false;
    });

    const results = {
      scannedCount: creatives.length,
      fatiguedCount: fatiguedCreatives.length,
      dispatched: {
        slack: 0,
        webhook: 0
      },
      alerts: []
    };

    for (const creative of fatiguedCreatives) {
      const alertItem = {
        creativeId: creative.id,
        adName: creative.adName,
        platform: creative.platform,
        fatigueScore: creative.fatigueScore,
        status: creative.fatigueStatus,
        dispatchedTo: []
      };

      // Dispatch to Slack
      if (config.slack_enabled && config.slack_webhook_url) {
        try {
          const slackPayload = this.buildSlackBlockKit(creative);
          await this.sendSlack(config.slack_webhook_url, slackPayload);
          results.dispatched.slack++;
          alertItem.dispatchedTo.push('slack');
        } catch (err) {
          console.error(`[FatigueAlertService] Slack dispatch failed for ${creative.id}:`, err.message);
          alertItem.slackError = err.message;
        }
      }

      // Dispatch to Custom Webhook
      if (config.webhook_enabled && config.custom_webhook_url) {
        try {
          await this.sendCustomWebhook(config.custom_webhook_url, {
            teamId,
            creative
          });
          results.dispatched.webhook++;
          alertItem.dispatchedTo.push('webhook');
        } catch (err) {
          console.error(`[FatigueAlertService] Webhook dispatch failed for ${creative.id}:`, err.message);
          alertItem.webhookError = err.message;
        }
      }

      results.alerts.push(alertItem);
    }

    return results;
  }

  /**
   * Send a test ping to Slack or custom webhook
   */
  static async testAlert({ channel = 'slack', webhookUrl, teamName = 'Demo Agency Workspace' }) {
    if (!webhookUrl || !webhookUrl.startsWith('http')) {
      throw new Error('Please provide a valid webhook URL starting with http:// or https://');
    }

    const sampleCreative = {
      id: 'cr_test_99',
      platform: 'Meta Ads',
      campaignName: 'Scale Campaign - Broad US',
      adName: 'Hook #4 "The Hidden Mistake" (Test Alert)',
      format: 'VIDEO',
      thumbnailUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
      spend: 4200,
      roas: 1.82,
      frequency: 3.65,
      fatigueStatus: 'warning',
      fatigueScore: 74,
      diagnosis: 'Audience frequency exceeded 3.6x. CTR decreased by 22% over the last 48 hours.',
      recommendedAction: 'Rotate new opening 3-second hook or test alternative audience angle.'
    };

    if (channel === 'slack') {
      const payload = this.buildSlackBlockKit(sampleCreative, teamName);
      await this.sendSlack(webhookUrl, payload);
      return { success: true, message: 'Slack test alert sent successfully via Block Kit.' };
    } else {
      await this.sendCustomWebhook(webhookUrl, {
        test: true,
        message: 'OmniHub Webhook Connection Verified',
        sampleCreative
      });
      return { success: true, message: 'Custom webhook test payload delivered successfully.' };
    }
  }
}

module.exports = FatigueAlertService;

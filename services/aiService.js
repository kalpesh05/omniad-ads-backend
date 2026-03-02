const { OpenAI } = require('openai');
const Anthropic = require('@anthropic-ai/sdk');

class AIService {
  constructor() {
    // Initialize Clients conditionally based on ENV keys
    this.openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
    this.anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;
    this.gemini = null;
    this.geminiApiKey = process.env.GEMINI_API_KEY || null;
    this.geminiInitPromise = null;
  }

  async _getGeminiClient() {
    if (!this.geminiApiKey) return null;
    if (this.gemini) return this.gemini;
    if (!this.geminiInitPromise) {
      this.geminiInitPromise = import('@google/genai').then(({ GoogleGenAI }) => {
        this.gemini = new GoogleGenAI({ apiKey: this.geminiApiKey });
        return this.gemini;
      });
    }
    return this.geminiInitPromise;
  }

  /**
   * Internal unified completion handler
   * @param {string} prompt The full instruction text
   * @param {string} provider 'openai' | 'anthropic' | 'gemini'
   */
  async _generateCompletion(prompt, provider = 'openai') {
    try {
      switch (provider.toLowerCase()) {
        case 'openai':
        case 'gpt':
          if (!this.openai) throw new Error('OpenAI API Key is missing.');
          const gptResponse = await this.openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
          });
          return gptResponse.choices[0].message.content;

        case 'anthropic':
        case 'claude':
          if (!this.anthropic) throw new Error('Anthropic API Key is missing.');
          const claudeResponse = await this.anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1024,
            messages: [{ role: 'user', content: prompt }]
          });
          return claudeResponse.content[0].text;

        case 'gemini':
        case 'google':
          this.gemini = await this._getGeminiClient();
          if (!this.gemini) throw new Error('Gemini API Key is missing.');
          const geminiResponse = await this.gemini.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
          });
          return geminiResponse.text;

        default:
          throw new Error(`Unsupported AI Provider: ${provider}. Supported: openai, anthropic, gemini`);
      }
    } catch (error) {
      console.error(`[AIService - ${provider}] Error:`, error.message);
      throw new Error(`AI Generation failed via ${provider}: ${error.message}`);
    }
  }

  /**
   * Generate engaging Ad Copy targeting a specific audience
   */
  async generateAdCopy(topic, targetAudience, platform = 'Facebook', provider = 'openai') {
    const prompt = `
You are an expert digital marketing copywriter. Generate 3 unique, high-converting ad variations for ${platform}.
Topic/Product: ${topic}
Target Audience: ${targetAudience}

Please format the output exactly as a JSON array of objects, containing { "headline": "...", "primaryText": "..." }. 
Do not wrap it in markdown block quotes. Just the raw JSON array.
        `;

    const rawText = await this._generateCompletion(prompt, provider);

    try {
      // Attempt to slice out just the JSON array if the model got chatty
      const startIdx = rawText.indexOf('[');
      const endIdx = rawText.lastIndexOf(']') + 1;
      return { success: true, data: JSON.parse(rawText.substring(startIdx, endIdx)) };
    } catch (e) {
      console.error('Failed to parse AI JSON:', rawText);
      return { success: false, error: 'AI returned malformed JSON output' };
    }
  }

  /**
   * Provide actionable insights off raw tracking metrics
   * (Overrides the previous mock implementation)
   */
  async getInsights(userId, propertyId, startDate, endDate, metricsSummary = null, provider = 'openai') {
    if (!metricsSummary) {
      metricsSummary = "Generic increase in CTR but lower conversion rate."; // Fallback for pure testing
    }

    const prompt = `
You are a senior media buyer analyzing ad campaign performance. Review the following metrics summary and provide 2 short, actionable bullet points on what to optimize or scale next.

Metrics:
${JSON.stringify(metricsSummary, null, 2)}

Format your response as a valid JSON array of objects exactly like this:
[
  { "type": "performance", "title": "...", "description": "...", "impact": "high", "recommendation": "..." }
]
        `;

    try {
      const rawText = await this._generateCompletion(prompt, provider);
      const startIdx = rawText.indexOf('[');
      const endIdx = rawText.lastIndexOf(']') + 1;
      return { success: true, data: { insights: JSON.parse(rawText.substring(startIdx, endIdx)) } };
    } catch (e) {
      return { success: false, error: 'AI failed to analyze insights' };
    }
  }

  // Legacy mapping to prevent older routes from crashing
  async chat(userId, message, context = {}) {
    try {
      const response = await this._generateCompletion(message, 'openai');
      return { success: true, data: { response, timestamp: new Date().toISOString(), context } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
module.exports = new AIService();

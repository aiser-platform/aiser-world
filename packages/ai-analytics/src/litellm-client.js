/**
 * LiteLLM Client for AI-Powered Analytics
 * Integrates with Azure OpenAI GPT-4.1-mini and other models
 */

const { OpenAI } = require('openai');
const winston = require('winston');

// Logger setup
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

class LiteLLMClient {
  constructor() {
    this.models = {
      primary: {
        provider: 'azure',
        model: 'gpt-4o-mini',
        apiKey: process.env.AZURE_OPENAI_API_KEY,
        endpoint: process.env.AZURE_OPENAI_ENDPOINT,
        apiVersion: '2024-02-15-preview'
      },
      fallback: [
        {
          provider: 'openai',
          model: 'gpt-4o-mini',
          apiKey: process.env.OPENAI_API_KEY
        }
      ]
    };

    this.initializeClients();
  }

  initializeClients() {
    try {
      // Primary Azure OpenAI client
      if (this.models.primary.apiKey && this.models.primary.endpoint) {
        this.primaryClient = new OpenAI({
          apiKey: this.models.primary.apiKey,
          baseURL: `${this.models.primary.endpoint}/openai/deployments/${this.models.primary.model}`,
          defaultQuery: { 'api-version': this.models.primary.apiVersion },
          defaultHeaders: {
            'api-key': this.models.primary.apiKey,
          }
        });
        logger.info('✅ Azure OpenAI client initialized');
      }

      // Fallback OpenAI client
      if (this.models.fallback[0].apiKey) {
        this.fallbackClient = new OpenAI({
          apiKey: this.models.fallback[0].apiKey
        });
        logger.info('✅ OpenAI fallback client initialized');
      }

    } catch (error) {
      logger.error('❌ Failed to initialize LiteLLM clients:', error);
    }
  }

  async generateCompletion(messages, options = {}) {
    const {
      temperature = 0.1,
      maxTokens = 1000,
      model = 'primary'
    } = options;

    try {
      // Try primary client first
      if (this.primaryClient && model === 'primary') {
        logger.info('🤖 Using Azure OpenAI GPT-4o-mini');
        const response = await this.primaryClient.chat.completions.create({
          model: this.models.primary.model,
          messages,
          temperature,
          max_tokens: maxTokens,
          response_format: { type: "json_object" }
        });

        return {
          success: true,
          content: response.choices[0].message.content,
          usage: response.usage,
          model: 'azure-gpt-4o-mini'
        };
      }

      // Fallback to OpenAI
      if (this.fallbackClient) {
        logger.info('🔄 Using OpenAI fallback');
        const response = await this.fallbackClient.chat.completions.create({
          model: this.models.fallback[0].model,
          messages,
          temperature,
          max_tokens: maxTokens,
          response_format: { type: "json_object" }
        });

        return {
          success: true,
          content: response.choices[0].message.content,
          usage: response.usage,
          model: 'openai-gpt-4o-mini'
        };
      }

      throw new Error('No available AI models configured');

    } catch (error) {
      logger.error('❌ AI completion failed:', error);
      return {
        success: false,
        error: error.message,
        model: model
      };
    }
  }

  async analyzeBusinessQuestion(question, cubeSchema) {
    const systemPrompt = `You are an expert business intelligence analyst. Your task is to analyze natural language business questions and convert them into Cube.js queries.

Available Cube.js Schema:
${JSON.stringify(cubeSchema, null, 2)}

Rules:
1. Always respond with valid JSON
2. Identify the intent: metrics, trends, comparisons, anomalies, or forecasting
3. Map business terms to Cube.js measures and dimensions
4. Suggest appropriate time granularity
5. Include confidence score (0-1)

Response format:
{
  "intent": "metrics|trends|comparisons|anomalies|forecasting",
  "confidence": 0.95,
  "cubeQuery": {
    "measures": ["Users.count"],
    "dimensions": ["Users.role"],
    "timeDimensions": [{
      "dimension": "Users.createdAt",
      "granularity": "day",
      "dateRange": "last 7 days"
    }]
  },
  "explanation": "This query will show user count by role over the last 7 days",
  "businessContext": "User growth analysis"
}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Analyze this business question: "${question}"` }
    ];

    return this.generateCompletion(messages, { temperature: 0.1 });
  }

  async generateInsights(queryResult, businessContext) {
    const systemPrompt = `You are a business intelligence expert. Analyze query results and generate actionable insights.

Rules:
1. Always respond with valid JSON
2. Identify key patterns, trends, and anomalies
3. Provide business-friendly explanations
4. Suggest actionable recommendations
5. Include confidence levels

Response format:
{
  "insights": [
    {
      "type": "trend|pattern|anomaly|opportunity",
      "title": "Key Finding Title",
      "description": "Detailed explanation in business terms",
      "confidence": 0.9,
      "impact": "high|medium|low",
      "recommendation": "Specific actionable recommendation"
    }
  ],
  "summary": "Executive summary of key findings",
  "nextSteps": ["Recommended follow-up analysis"]
}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { 
        role: 'user', 
        content: `Analyze this data and generate insights:
        
Business Context: ${businessContext}
Query Results: ${JSON.stringify(queryResult, null, 2)}` 
      }
    ];

    return this.generateCompletion(messages, { temperature: 0.2 });
  }

  async explainQuery(cubeQuery, businessQuestion) {
    const systemPrompt = `You are a data analyst explaining technical queries in business terms.

Rules:
1. Always respond with valid JSON
2. Explain what the query does in simple business language
3. Describe what insights it will provide
4. Mention any limitations or assumptions

Response format:
{
  "explanation": "This query analyzes...",
  "insights": "You will learn about...",
  "limitations": "Keep in mind that...",
  "confidence": 0.95
}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { 
        role: 'user', 
        content: `Explain this Cube.js query in business terms:
        
Original Question: ${businessQuestion}
Cube.js Query: ${JSON.stringify(cubeQuery, null, 2)}` 
      }
    ];

    return this.generateCompletion(messages, { temperature: 0.1 });
  }
}

module.exports = { LiteLLMClient };
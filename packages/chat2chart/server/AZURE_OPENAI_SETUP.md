# Azure OpenAI Setup Guide

## Why Azure OpenAI?

Azure OpenAI provides:
- **Higher token limits** (up to 128K tokens for GPT-4)
- **Better rate limits** for enterprise usage
- **Cost optimization** with Azure credits
- **Enterprise security** and compliance

## Setup Steps

### 1. Create Azure OpenAI Resource

1. Go to [Azure Portal](https://portal.azure.com)
2. Search for "Azure OpenAI"
3. Click "Create"
4. Fill in the required fields:
   - **Subscription**: Your Azure subscription
   - **Resource Group**: Create new or use existing
   - **Region**: Choose closest to you
   - **Name**: Give it a unique name
   - **Pricing Tier**: Choose based on your needs

### 2. Deploy Models

1. Go to your Azure OpenAI resource
2. Click "Model deployments"
3. Click "Manage deployments"
4. Deploy these models:
   - **GPT-4o Mini** (recommended for cost efficiency)
   - **GPT-4** (for advanced reasoning)

### 3. Get Configuration Details

1. **API Key**: Go to "Keys and Endpoint" → Copy Key 1 or Key 2
2. **Endpoint**: Copy the endpoint URL
3. **Deployment Name**: Use the name you gave to your model deployment

### 4. Environment Variables

Add these to your `.env` file:

```bash
# Azure OpenAI (Primary)
AZURE_OPENAI_API_KEY=your_api_key_here
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_VERSION=2024-02-15-preview
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o-mini

# Remove or comment out OpenAI keys to force Azure usage
# OPENAI_API_KEY=your_openai_key
```

### 5. Test Configuration

Restart your backend server and test with:

```bash
curl -X POST http://localhost:8000/chats/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "Hello, test Azure OpenAI"}'
```

## Troubleshooting

### Common Issues:

1. **Authentication Error**: Check API key and endpoint
2. **Model Not Found**: Verify deployment name matches exactly
3. **Rate Limit**: Check your Azure OpenAI tier limits
4. **Region Issues**: Ensure endpoint matches your resource region

### Fallback Behavior:

If Azure OpenAI fails, the system will:
- Log the error
- Provide intelligent fallback responses
- Guide users to connect data sources
- Continue working with basic functionality

## Cost Optimization

- **GPT-4o Mini**: ~$0.00015 per 1K tokens (recommended)
- **GPT-4**: ~$0.03 per 1K tokens (for complex queries)
- **Use caching** to reduce API calls
- **Monitor usage** in Azure portal

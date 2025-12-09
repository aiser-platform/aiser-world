# Azure OpenAI Configuration Guide

## Required Environment Variables

To use Azure OpenAI models, you need to set the following environment variables in your `.env` file:

### Primary Configuration (Required)

```bash
# Azure OpenAI API Key (required)
AZURE_OPENAI_API_KEY=your_azure_api_key_here

# Azure OpenAI Endpoint URL (required)
# Format: https://your-resource-name.openai.azure.com/
AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com/

# API Version (optional, defaults to 2025-01-01-preview)
AZURE_OPENAI_API_VERSION=2025-04-01-preview

# Deployment Name (optional, defaults to gpt-5-mini)
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-5-mini
```

### Alternative Variable Names (Supported)

The system also supports these alternative variable names for compatibility:

```bash
# Alternative names for API key
AZURE_API_KEY=your_azure_api_key_here

# Alternative names for endpoint
AZURE_API_BASE=https://your-resource-name.openai.azure.com/
AZURE_OPENAI_ENDPOINT_URL=https://your-resource-name.openai.azure.com/
AZURE_OPENAI_BASE=https://your-resource-name.openai.azure.com/

# Alternative name for API version
AZURE_API_VERSION=2025-04-01-preview
```

### GPT-4.1 Mini Configuration (Optional)

If you want to use a separate deployment for GPT-4.1 Mini:

```bash
AZURE_OPENAI_GPT41_API_KEY=your_gpt41_api_key_here
AZURE_OPENAI_GPT41_ENDPOINT=https://your-resource-name.openai.azure.com/
AZURE_OPENAI_GPT41_API_VERSION=2025-01-01-preview
AZURE_OPENAI_GPT41_DEPLOYMENT_NAME=gpt-4.1-mini
```

If not set, GPT-4.1 Mini will use the same credentials as GPT-5 Mini.

## How to Get Your Azure OpenAI Credentials

1. **Azure Portal**: Go to https://portal.azure.com
2. **Azure OpenAI Resource**: Navigate to your Azure OpenAI resource
3. **Keys and Endpoint**: 
   - Go to "Keys and Endpoint" section
   - Copy the **API Key** (KEY1 or KEY2)
   - Copy the **Endpoint** URL (e.g., `https://your-resource.openai.azure.com/`)
4. **Deployments**: 
   - Go to "Deployments" section
   - Note your deployment name (e.g., `gpt-5-mini`)

## Example .env Configuration

```bash
# Azure OpenAI - Primary Configuration
AZURE_OPENAI_API_KEY= 
AZURE_OPENAI_ENDPOINT=
AZURE_OPENAI_API_VERSION=2025-04-01-preview
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-5-mini

# Azure OpenAI - GPT-4.1 Mini (Optional - uses primary if not set)
AZURE_OPENAI_GPT41_API_KEY=
AZURE_OPENAI_GPT41_ENDPOINT=
AZURE_OPENAI_GPT41_API_VERSION=2025-01-01-preview
AZURE_OPENAI_GPT41_DEPLOYMENT_NAME=gpt-4.1-mini

# OpenAI Fallback (Optional)
OPENAI_API_KEY=sk-...
```

## Validation

After setting your environment variables, restart the server and check the logs. You should see:

```
============================================================
🔧 AI Model Configuration Status
============================================================
✅ Azure GPT-5 Mini: CONFIGURED
   - Deployment: gpt-5-mini
   - Endpoint:  
   - API Version: 2025-04-01-preview
   - API Key: ********UlA
============================================================
```

If you see "NOT CONFIGURED", check that:
1. Your `.env` file is in the correct location
2. The environment variables are set (not empty)
3. The server has been restarted after setting the variables
4. The endpoint URL ends with `/` (the system will auto-fix this)

## Troubleshooting

### Error: "Azure OpenAI API key not configured"
- **Solution**: Set `AZURE_OPENAI_API_KEY` in your `.env` file

### Error: "Azure OpenAI endpoint not configured"
- **Solution**: Set `AZURE_OPENAI_ENDPOINT` in your `.env` file
- **Note**: Endpoint should be the full URL, e.g., `https://your-resource.openai.azure.com/`

### Error: "Incorrect API key provided"
- **Solution**: Verify your API key is correct in Azure Portal
- **Check**: Make sure you're using the Azure OpenAI API key, not the OpenAI API key

### Error: "Deployment not found"
- **Solution**: Verify your deployment name matches what's in Azure Portal
- **Check**: Go to Azure Portal → Your Resource → Deployments → Check deployment name

## Security Notes

- **Never commit `.env` files** to version control
- **Rotate API keys** regularly
- **Use environment-specific keys** for dev/staging/production
- **Restrict API key permissions** in Azure Portal when possible


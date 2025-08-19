# Azure OpenAI + LiteLLM Configuration Guide

## Critical Format Requirements for LiteLLM

### 1. **Model Name Format** ⚠️ CRITICAL
LiteLLM requires Azure models in this **exact** format:
```
azure/gpt-4o-mini
azure/gpt-4
azure/gpt-35-turbo
```

**NOT:**
- ❌ `gpt-4o-mini` (missing `azure/` prefix)
- ❌ `azure-gpt-4o-mini` (wrong separator)
- ❌ `gpt-4o-mini-azure` (wrong order)

### 2. **Environment Variables Format**

```bash
# Azure OpenAI (Primary)
AZURE_OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_VERSION=2024-02-15-preview
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o-mini

# OpenAI (Fallback)
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_MODEL_ID=gpt-4o-mini
```

### 3. **Endpoint Format Requirements**

**✅ CORRECT:**
```
https://your-resource.openai.azure.com/
```

**❌ INCORRECT:**
```
https://your-resource.openai.azure.com          # Missing trailing slash
http://your-resource.openai.azure.com/         # HTTP instead of HTTPS
https://your-resource.openai.azure.com         # Missing trailing slash
```

### 4. **Deployment Name Must Match Exactly**

The deployment name in Azure Portal must **exactly match** your environment variable:

```bash
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o-mini
```

**Azure Portal → Model deployments → Must show:**
- Deployment name: `gpt-4o-mini`
- Model: `gpt-4o-mini`

### 5. **API Version Requirements**

**Supported versions:**
- `2024-02-15-preview` ✅ (Recommended)
- `2024-05-01-preview` ✅
- `2023-12-01-preview` ✅

**NOT supported:**
- `2024-01-01` ❌ (No preview suffix)

## Testing Your Configuration

### 1. **Test with curl**
```bash
curl -X POST http://localhost:8000/chats/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "Hello, test Azure OpenAI"}'
```

### 2. **Check Backend Logs**
Look for these log messages:
```
✅ Azure OpenAI Configuration:
   - API Key: ********xxxx
   - Endpoint: https://your-resource.openai.azure.com/
   - API Version: 2024-02-15-preview
   - Deployment: gpt-4o-mini
   - Model Format: azure/gpt-4o-mini
```

### 3. **Test Azure OpenAI Specifically**
```bash
# This will test Azure OpenAI connection
curl -X POST http://localhost:8000/test-azure-openai \
  -H "Content-Type: application/json"
```

## Common Issues & Solutions

### Issue 1: "AuthenticationError: Incorrect API key provided"
**Solution:**
- Verify API key is correct
- Check if key has expired
- Ensure key has proper permissions

### Issue 2: "Model not found"
**Solution:**
- Verify deployment name matches exactly
- Check if model is deployed in Azure Portal
- Ensure deployment is active

### Issue 3: "Invalid endpoint"
**Solution:**
- Ensure endpoint ends with `/`
- Verify HTTPS protocol
- Check resource name spelling

### Issue 4: "API version not supported"
**Solution:**
- Use `2024-02-15-preview` or newer
- Check Azure OpenAI service updates

## LiteLLM Integration Details

### How LiteLLM Processes Azure Models

1. **Model Resolution:**
   ```
   azure/gpt-4o-mini → LiteLLM recognizes as Azure model
   ```

2. **Parameter Mapping:**
   ```python
   litellm_params = {
       'model': 'azure/gpt-4o-mini',
       'api_key': 'your_azure_key',
       'api_base': 'https://your-resource.openai.azure.com/',
       'api_version': '2024-02-15-preview'
   }
   ```

3. **Request Transformation:**
   LiteLLM automatically:
   - Adds Azure-specific headers
   - Formats the request for Azure OpenAI API
   - Handles authentication

## Verification Checklist

- [ ] API key is valid and active
- [ ] Endpoint URL is correct and ends with `/`
- [ ] API version is supported
- [ ] Deployment name matches exactly
- [ ] Model is deployed and active in Azure
- [ ] Resource is in the correct region
- [ ] No firewall/network restrictions
- [ ] LiteLLM is properly installed
- [ ] Environment variables are loaded
- [ ] Backend server is restarted after changes

## Next Steps

1. **Verify your `.env` file** matches the format above
2. **Restart your backend server**
3. **Check backend logs** for configuration validation
4. **Test with curl** to verify connection
5. **Try the chat interface** to see AI responses

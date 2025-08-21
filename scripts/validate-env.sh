#!/bin/bash

# Environment Variables Validation Script
# This script checks that all required environment variables are set

set -e

echo "🔍 Validating environment variables..."

# Load .env file if it exists
if [ -f .env ]; then
    echo "📁 Loading .env file..."
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "⚠️  .env file not found. Checking system environment variables..."
fi

# Required variables (no fallbacks)
required_vars=(
    "POSTGRES_PASSWORD"
    "SECRET_KEY"
)

# Required for Azure OpenAI
azure_required_vars=(
    "AZURE_OPENAI_API_KEY"
    "AZURE_OPENAI_ENDPOINT"
)

# Check if Azure OpenAI is being used
if [ -n "$AZURE_OPENAI_API_KEY" ] || [ -n "$AZURE_OPENAI_ENDPOINT" ]; then
    echo "🔑 Azure OpenAI configuration detected, validating required variables..."
    required_vars+=("${azure_required_vars[@]}")
fi

# Check if OpenAI is being used
if [ -n "$OPENAI_API_KEY" ]; then
    echo "🤖 OpenAI configuration detected, validating required variables..."
    required_vars+=("OPENAI_API_KEY")
fi

# Validate required variables
missing_vars=()
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

# Report results
if [ ${#missing_vars[@]} -eq 0 ]; then
    echo "✅ All required environment variables are set!"
    
    # Show summary of key variables
    echo ""
    echo "📋 Environment Summary:"
    echo "   Database: ${POSTGRES_DB:-aiser_world}@${POSTGRES_HOST:-postgres}:${POSTGRES_PORT:-5432}"
    echo "   User: ${POSTGRES_USER:-aiser}"
    echo "   Debug: ${DEBUG:-False}"
    echo "   Environment: ${ENVIRONMENT:-development}"
    
    if [ -n "$AZURE_OPENAI_API_KEY" ]; then
        echo "   Azure OpenAI: ✅ Configured"
        echo "   Endpoint: ${AZURE_OPENAI_ENDPOINT}"
        echo "   Deployment: ${AZURE_OPENAI_DEPLOYMENT_NAME:-gpt-5-mini}"
    fi
    
    if [ -n "$OPENAI_API_KEY" ]; then
        echo "   OpenAI: ✅ Configured"
        echo "   Model: ${OPENAI_MODEL_ID:-gpt-4o-mini}"
    fi
    
    echo ""
    echo "🚀 Ready to start Docker services!"
    exit 0
else
    echo "❌ Missing required environment variables:"
    for var in "${missing_vars[@]}"; do
        echo "   - $var"
    done
    
    echo ""
    echo "📝 Please set these variables in your .env file:"
    echo "   cp env.example .env"
    echo "   # Then edit .env with your actual values"
    
    echo ""
    echo "🔧 Required variables for your setup:"
    for var in "${missing_vars[@]}"; do
        case $var in
            "POSTGRES_PASSWORD")
                echo "   POSTGRES_PASSWORD=your_secure_database_password"
                ;;
            "SECRET_KEY")
                echo "   SECRET_KEY=$(openssl rand -base64 32 2>/dev/null || echo 'your_secure_secret_key')"
                ;;
            "AZURE_OPENAI_API_KEY")
                echo "   AZURE_OPENAI_API_KEY=your_azure_openai_api_key"
                ;;
            "AZURE_OPENAI_ENDPOINT")
                echo "   AZURE_OPENAI_ENDPOINT=https://your_resource.openai.azure.com/"
                ;;
            "OPENAI_API_KEY")
                echo "   OPENAI_API_KEY=your_openai_api_key"
                ;;
            *)
                echo "   $var=your_value_here"
                ;;
        esac
    done
    
    exit 1
fi

#!/usr/bin/env python3
"""
Test Azure OpenAI Connection
Simple script to test your Azure OpenAI configuration
"""

import os
from pathlib import Path
from dotenv import load_dotenv
from litellm import completion

# Load environment variables from .env file
env_path = Path(__file__).parent / '.env'
if env_path.exists():
    load_dotenv(env_path)
else:
    print("⚠️  .env file not found. Make sure to create one based on env.example")
    print("   The script will use system environment variables if available.")

def test_azure_openai():
    """Test Azure OpenAI connection"""
    print("🧪 Testing Azure OpenAI Connection...")
    
    # Get environment variables
    api_key = os.getenv('AZURE_OPENAI_API_KEY')
    endpoint = os.getenv('AZURE_OPENAI_ENDPOINT')
    api_version = os.getenv('AZURE_OPENAI_API_VERSION', '2025-04-01-preview')
    
    if not api_key:
        print("❌ AZURE_OPENAI_API_KEY not found in environment variables")
        print("   Please set it in your .env file or system environment")
        return None
    
    if not endpoint:
        print("❌ AZURE_OPENAI_ENDPOINT not found in environment variables")
        print("   Please set it in your .env file or system environment")
        return None
    
    print(f"🔑 API Key: {'*' * 8 + api_key[-4:] if len(api_key) > 4 else '***'}")
    print(f"🌐 Endpoint: {endpoint}")
    print(f"📅 API Version: {api_version}")
    
    # Test different deployment names
    deployment_names = [
        'gpt-5-mini',
        'gpt-4o-mini', 
        'gpt-4',
        'gpt-35-turbo'
    ]
    
    for deployment in deployment_names:
        print(f"\n🔍 Testing deployment: {deployment}")
        try:
            response = completion(
                model=f"azure/{deployment}",
                messages=[{"role": "user", "content": "Hello, respond with 'Azure OpenAI connection successful'"}],
                api_key=api_key,
                api_base=endpoint,
                api_version=api_version
            )
            print(f"✅ SUCCESS with {deployment}: {response.choices[0].message.content}")
            return deployment
        except Exception as e:
            print(f"❌ FAILED with {deployment}: {str(e)}")
    
    return None

if __name__ == "__main__":
    working_deployment = test_azure_openai()
    if working_deployment:
        print(f"\n🎉 Working deployment found: {working_deployment}")
        print(f"Update your .env file with: AZURE_OPENAI_DEPLOYMENT_NAME={working_deployment}")
    else:
        print("\n💥 No working deployments found. Check your Azure OpenAI resource.")
        print("\n📝 Make sure your .env file contains:")
        print("   AZURE_OPENAI_API_KEY=your_actual_api_key")
        print("   AZURE_OPENAI_ENDPOINT=https://your_resource.openai.azure.com/")
        print("   AZURE_OPENAI_API_VERSION=2025-04-01-preview")

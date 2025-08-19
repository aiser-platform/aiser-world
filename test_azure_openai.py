#!/usr/bin/env python3
"""
Test Azure OpenAI Connection
Simple script to test your Azure OpenAI configuration
"""

import os
from litellm import completion

# Set environment variables (you can also set these in your .env file)
os.environ['AZURE_OPENAI_API_KEY'] = '35rWswdPyyyisuGwl2tgrlxFtfLhjD0cFDQaJi44YzBx91Rz3nINJQQJ99BEACHYHv6XJ3w3AAABACOGbUlA'
os.environ['AZURE_OPENAI_ENDPOINT'] = 'https://ateybot-eastus2-123-nut.openai.azure.com/'
os.environ['AZURE_OPENAI_API_VERSION'] = '2025-04-01-preview'

def test_azure_openai():
    """Test Azure OpenAI connection"""
    print("🧪 Testing Azure OpenAI Connection...")
    print(f"🔑 API Key: {'*' * 8 + os.environ['AZURE_OPENAI_API_KEY'][-4:]}")
    print(f"🌐 Endpoint: {os.environ['AZURE_OPENAI_ENDPOINT']}")
    print(f"📅 API Version: {os.environ['AZURE_OPENAI_API_VERSION']}")
    
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
                api_key=os.environ['AZURE_OPENAI_API_KEY'],
                api_base=os.environ['AZURE_OPENAI_ENDPOINT'],
                api_version=os.environ['AZURE_OPENAI_API_VERSION']
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

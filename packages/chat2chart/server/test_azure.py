#!/usr/bin/env python3
"""
Test Azure OpenAI connection with the exact format suggested
"""
import os
import litellm
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_azure_connection():
    try:
        print("Testing Azure OpenAI connection...")
        print(f"Deployment: {os.environ.get('AZURE_OPENAI_DEPLOYMENT_NAME')}")
        print(f"Endpoint: {os.environ.get('AZURE_OPENAI_ENDPOINT')}")
        print(f"API Version: {os.environ.get('AZURE_OPENAI_API_VERSION')}")
        
        resp = litellm.chat.completions.create(
            model=f"azure/{os.environ['AZURE_OPENAI_DEPLOYMENT_NAME']}",
            messages=[{"role":"user","content":"Hello, how are you?"}],
            api_base=os.environ["AZURE_OPENAI_ENDPOINT"],
            api_key=os.environ["AZURE_OPENAI_API_KEY"],
            api_version=os.environ["AZURE_OPENAI_API_VERSION"],
            max_tokens=200,
            temperature=0.7
        )
        
        print("✅ Success!")
        print(f"Response: {resp.choices[0].message.content}")
        print(f"Model: {resp.model}")
        print(f"Usage: {resp.usage}")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_azure_connection()


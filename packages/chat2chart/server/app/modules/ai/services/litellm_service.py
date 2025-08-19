"""
LiteLLM Service for FastAPI Backend
Provides unified AI model access through LiteLLM
"""

import logging
import os
from typing import Dict, List, Optional, Any
import asyncio
from litellm import acompletion, completion
import json
from app.core.cache import cache

# Configure LiteLLM to drop unsupported parameters for GPT-5
import litellm
litellm.drop_params = True

logger = logging.getLogger(__name__)


class LiteLLMService:
    """Service for managing LiteLLM AI model interactions"""
    
    def __init__(self):
        # Azure OpenAI Configuration (Primary)
        self.azure_api_key = os.getenv('AZURE_OPENAI_API_KEY')
        self.azure_endpoint = os.getenv('AZURE_OPENAI_ENDPOINT')
        self.azure_api_version = os.getenv('AZURE_OPENAI_API_VERSION', '2025-04-01-preview')
        self.azure_deployment = os.getenv('AZURE_OPENAI_DEPLOYMENT_NAME', 'gpt-5-mini')
        
        # OpenAI Configuration (Fallback)
        self.openai_api_key = os.getenv('OPENAI_API_KEY')
        self.openai_model = os.getenv('OPENAI_MODEL_ID', 'gpt-4o-mini')
        
        # Validate and log Azure OpenAI configuration
        self._validate_azure_config()
        
        # Available models for user selection
        self.available_models = {
            'azure_gpt5_mini': {
                'name': 'GPT-5 Mini (Azure)',
                'model': f'azure/{self.azure_deployment}',
                'api_key': self.azure_api_key,
                'api_base': self.azure_endpoint,
                'api_version': self.azure_api_version,
                'max_tokens': 8000,
                'temperature': 1.0,  # GPT-5 only supports temperature=1
                'cost_per_1k_tokens': 0.0001,
                'provider': 'azure'
            },
            'azure_gpt5': {
                'name': 'GPT-5 (Azure)',
                'model': 'azure/gpt-5',
                'api_key': self.azure_api_key,
                'api_base': self.azure_endpoint,
                'api_version': self.azure_api_version,
                'max_tokens': 8000,
                'temperature': 1.0,  # GPT-5 only supports temperature=1
                'cost_per_1k_tokens': 0.02,
                'provider': 'azure'
            },
            'azure_gpt4_mini': {
                'name': 'GPT-4o Mini (Azure)',
                'model': 'azure/gpt-4o-mini',
                'api_key': self.azure_api_key,
                'api_base': self.azure_endpoint,
                'api_version': self.azure_api_version,
                'max_tokens': 4000,
                'temperature': 0.1,
                'cost_per_1k_tokens': 0.00015,
                'provider': 'azure'
            },
            'openai_gpt4_mini': {
                'name': 'GPT-4o Mini (OpenAI)',
                'model': 'gpt-4o-mini',
                'api_key': self.openai_api_key,
                'max_tokens': 4000,
                'temperature': 0.1,
                'cost_per_1k_tokens': 0.00015,
                'provider': 'openai'
            },
            'openai_gpt35': {
                'name': 'GPT-3.5 Turbo (OpenAI)',
                'model': 'gpt-3.5-turbo',
                'api_key': self.openai_api_key,
                'max_tokens': 4000,
                'temperature': 0.1,
                'cost_per_1k_tokens': 0.0015,
                'provider': 'openai'
            }
        }
        
        # Default model selection - Prioritize Azure OpenAI GPT-5 for better token availability
        if self.azure_api_key and self.azure_endpoint:
            self.default_model = 'azure_gpt5_mini'
            logger.info("🚀 Using Azure OpenAI GPT-5 Mini as primary model")
        elif self.openai_api_key:
            self.default_model = 'openai_gpt4_mini'
            logger.info("🚀 Using OpenAI as fallback model")
        else:
            self.default_model = 'azure_gpt5_mini'  # Default to Azure even without key for error handling
            logger.warning("⚠️ No valid API keys found - will use fallback responses")
        
        # Cost optimization settings
        self.cost_optimization = {
            'max_tokens_per_request': 4000,
            'enable_caching': True,
            'cache_ttl': 300  # 5 minutes
        }
        
        # Simple cache for responses
        self.response_cache = {}
    
    def _validate_azure_config(self):
        """Validate Azure OpenAI configuration and log status"""
        if self.azure_api_key and self.azure_endpoint:
            # Ensure endpoint ends with /
            if not self.azure_endpoint.endswith('/'):
                self.azure_endpoint = self.azure_endpoint + '/'
                logger.info(f"🔧 Fixed Azure endpoint: {self.azure_endpoint}")
            
            logger.info("✅ Azure OpenAI Configuration:")
            logger.info(f"   - API Key: {'*' * 8 + self.azure_api_key[-4:] if self.azure_api_key else 'Not set'}")
            logger.info(f"   - Endpoint: {self.azure_endpoint}")
            logger.info(f"   - API Version: {self.azure_api_version}")
            logger.info(f"   - Deployment: {self.azure_deployment}")
            logger.info(f"   - Model Format: azure/{self.azure_deployment}")
        else:
            logger.warning("⚠️ Azure OpenAI not configured:")
            logger.warning(f"   - API Key: {'Set' if self.azure_api_key else 'Not set'}")
            logger.warning(f"   - Endpoint: {'Set' if self.azure_endpoint else 'Not set'}")
        
        if self.openai_api_key:
            logger.info("✅ OpenAI Configuration:")
            logger.info(f"   - API Key: {'*' * 8 + self.openai_api_key[-4:] if self.openai_api_key else 'Not set'}")
            logger.info(f"   - Model: {self.openai_model}")
        else:
            logger.warning("⚠️ OpenAI API key not set")

    async def analyze_natural_language_query(
        self, 
        query: str, 
        context: Optional[Dict[str, Any]] = None,
        model_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Analyze natural language query using LiteLLM"""
        try:
            logger.info(f"🧠 Analyzing query with LiteLLM: {query[:50]}...")
            
            # Check Redis cache first
            cached_analysis = cache.get_ai_response(query, context or {})
            if cached_analysis:
                logger.info("📋 Using cached analysis from Redis")
                return cached_analysis
            
            # Prepare context
            context_str = ""
            if context:
                context_str = f"\nContext: {json.dumps(context, indent=2)}"
            
            # Create analysis prompt
            prompt = f"""
Analyze this natural language query for data visualization and analytics:

Query: "{query}"{context_str}

Please analyze and return a JSON response with:
1. query_type: Array of types (trends, comparisons, metrics, anomalies, forecasting, segmentation)
2. business_context: Object with type and relevant measures/dimensions
3. time_context: Object with range and granularity
4. entities: Array of entities mentioned (users, charts, conversations, etc.)
5. intent: Primary intent (explore, monitor, analyze, compare, predict)
6. complexity: Number from 1-5
7. urgency: low, medium, or high

Return only valid JSON.
"""

            # Select model configuration
            selected_model = model_id or self.default_model
            model_config = self.available_models.get(selected_model, self.available_models[self.default_model])
            
            # Prepare LiteLLM parameters
            litellm_params = {
                'model': model_config['model'],
                'messages': [
                    {"role": "system", "content": "You are an expert data analyst. Analyze queries and return structured JSON responses."},
                    {"role": "user", "content": prompt}
                ],
                'max_tokens': model_config['max_tokens'],
                'temperature': model_config['temperature']
            }
            
            # Add Azure-specific parameters
            if model_config['provider'] == 'azure':
                litellm_params.update({
                    'api_key': model_config['api_key'],
                    'api_base': model_config['api_base'],
                    'api_version': model_config['api_version']
                })
            else:
                litellm_params['api_key'] = model_config['api_key']
            
            # Call LiteLLM
            logger.info(f"🔧 Calling LiteLLM with model: {model_config['model']}")
            logger.info(f"🔧 API Base: {model_config.get('api_base', 'N/A')}")
            
            response = await acompletion(**litellm_params)
            
            # Parse response
            content = response.choices[0].message.content.strip()
            
            # Clean JSON response (remove markdown formatting if present)
            if content.startswith('```json'):
                content = content.replace('```json', '').replace('```', '').strip()
            
            analysis = json.loads(content)
            
            # Add original query
            analysis['original_query'] = query
            
            # Cache the response in Redis
            cache.set_ai_response(query, context or {}, analysis)
            logger.info("💾 Cached analysis in Redis")
            
            logger.info(f"✅ Query analysis completed: {analysis.get('query_type', [])}")
            return analysis
            
        except Exception as error:
            logger.error(f"❌ LiteLLM analysis failed: {str(error)}")
            
            # Fallback to rule-based analysis
            return self._fallback_analysis(query)

    async def generate_chart_recommendations(
        self, 
        data_analysis: Dict[str, Any], 
        query_analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate chart recommendations using LiteLLM"""
        try:
            logger.info("📊 Generating chart recommendations with LiteLLM...")
            
            prompt = f"""
Based on this data analysis and query analysis, recommend the best chart types:

Data Analysis:
{json.dumps(data_analysis, indent=2)}

Query Analysis:
{json.dumps(query_analysis, indent=2)}

Please recommend chart types and return JSON with:
1. primary_recommendation: Best chart type (line, bar, pie, scatter, gauge)
2. alternative_recommendations: Array of other suitable chart types
3. reasoning: Explanation for the primary recommendation
4. styling_suggestions: Object with color scheme and theme suggestions

Return only valid JSON.
"""

            # Get model config for chart recommendations
            selected_model = 'azure_gpt5_mini' if self.azure_api_key else 'openai_gpt4_mini'
            model_config = self.available_models.get(selected_model, self.available_models[self.default_model])
            
            response = await acompletion(
                model=model_config['model'],
                messages=[
                    {"role": "system", "content": "You are an expert data visualization specialist. Recommend optimal chart types based on data characteristics."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=1000,
                temperature=0.2,
                api_key=model_config['api_key'],
                api_base=model_config.get('api_base'),
                api_version=model_config.get('api_version')
            )
            
            content = response.choices[0].message.content.strip()
            if content.startswith('```json'):
                content = content.replace('```json', '').replace('```', '').strip()
            
            recommendations = json.loads(content)
            
            logger.info(f"✅ Chart recommendations generated: {recommendations.get('primary_recommendation')}")
            return recommendations
            
        except Exception as error:
            logger.error(f"❌ Chart recommendations failed: {str(error)}")
            return self._fallback_chart_recommendations(data_analysis, query_analysis)

    async def generate_business_insights(
        self, 
        data: List[Dict[str, Any]], 
        query_analysis: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Generate business insights using LiteLLM"""
        try:
            logger.info("💡 Generating business insights with LiteLLM...")
            
            # Prepare data summary
            data_summary = {
                'row_count': len(data),
                'columns': list(data[0].keys()) if data else [],
                'sample_data': data[:3] if len(data) > 3 else data
            }
            
            prompt = f"""
Analyze this data and generate business insights:

Query: "{query_analysis.get('original_query', '')}"
Data Summary: {json.dumps(data_summary, indent=2)}
Query Analysis: {json.dumps(query_analysis, indent=2)}

Generate 2-3 actionable business insights and return JSON array with objects containing:
1. type: Type of insight (trend, pattern, anomaly, opportunity, risk)
2. title: Brief insight title
3. description: Detailed explanation
4. confidence: Confidence level (0.0-1.0)
5. actionable: Boolean if insight suggests specific actions
6. recommendations: Array of recommended actions

Return only valid JSON array.
"""

            # Get model config for business insights
            selected_model = 'azure_gpt5_mini' if self.azure_api_key else 'openai_gpt4_mini'
            model_config = self.available_models.get(selected_model, self.available_models[self.default_model])
            
            response = await acompletion(
                model=model_config['model'],
                messages=[
                    {"role": "system", "content": "You are a business intelligence expert. Generate actionable insights from data analysis."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=1500,
                temperature=0.3,
                api_key=model_config['api_key'],
                api_base=model_config.get('api_base'),
                api_version=model_config.get('api_version')
            )
            
            content = response.choices[0].message.content.strip()
            if content.startswith('```json'):
                content = content.replace('```json', '').replace('```', '').strip()
            
            insights = json.loads(content)
            
            logger.info(f"✅ Business insights generated: {len(insights)} insights")
            return insights
            
        except Exception as error:
            logger.error(f"❌ Business insights generation failed: {str(error)}")
            return self._fallback_business_insights(data, query_analysis)

    async def test_model_availability(self, model_id: Optional[str] = None) -> Dict[str, Any]:
        """Test LiteLLM model availability"""
        # Initialize variables outside try block to avoid scope issues
        selected_model = model_id or self.default_model
        model_config = self.available_models.get(selected_model, self.available_models[self.default_model])
        
        try:
            
            # Prepare test parameters
            test_params = {
                'model': model_config['model'],
                'messages': [{"role": "user", "content": "Test"}],
                'max_tokens': 5
            }
            
            if model_config['provider'] == 'azure':
                test_params.update({
                    'api_key': model_config['api_key'],
                    'api_base': model_config['api_base'],
                    'api_version': model_config['api_version']
                })
            else:
                test_params['api_key'] = model_config['api_key']
            
            response = await acompletion(**test_params)
            
            return {
                'success': True,
                'model': selected_model,
                'model_name': model_config['name'],
                'status': 'available',
                'provider': model_config['provider']
            }
            
        except Exception as error:
            logger.error(f"❌ Model availability test failed: {str(error)}")
            return {
                'success': False,
                'model': selected_model,
                'status': 'unavailable',
                'error': str(error)
            }

    def get_available_models(self) -> Dict[str, Any]:
        """Get list of available models for user selection"""
        return {
            'models': [
                {
                    'id': model_id,
                    'name': config['name'],
                    'provider': config['provider'],
                    'cost_per_1k_tokens': config['cost_per_1k_tokens'],
                    'available': bool(config['api_key'])
                }
                for model_id, config in self.available_models.items()
            ],
            'default_model': self.default_model
        }

    def set_default_model(self, model_id: str) -> Dict[str, Any]:
        """Set default model for the session"""
        if model_id in self.available_models:
            self.default_model = model_id
            return {
                'success': True,
                'default_model': model_id,
                'model_name': self.available_models[model_id]['name']
            }
        else:
            return {
                'success': False,
                'error': f'Model {model_id} not available'
            }

    # Fallback methods for when LiteLLM fails
    def _fallback_analysis(self, query: str) -> Dict[str, Any]:
        """Fallback rule-based query analysis"""
        query_lower = query.lower()
        
        # Simple rule-based classification
        query_types = []
        if any(word in query_lower for word in ['trend', 'over time', 'growth', 'change']):
            query_types.append('trends')
        if any(word in query_lower for word in ['compare', 'vs', 'versus', 'difference']):
            query_types.append('comparisons')
        if any(word in query_lower for word in ['how many', 'count', 'total', 'sum']):
            query_types.append('metrics')
        
        return {
            'original_query': query,
            'query_type': query_types if query_types else ['general'],
            'business_context': {'type': 'general'},
            'time_context': {'range': 'last 30 days', 'granularity': 'day'},
            'entities': [],
            'intent': 'explore',
            'complexity': 2,
            'urgency': 'low',
            'fallback': True
        }

    def _fallback_chart_recommendations(self, data_analysis: Dict, query_analysis: Dict) -> Dict[str, Any]:
        """Fallback chart recommendations"""
        query_types = query_analysis.get('query_type', [])
        
        if 'trends' in query_types:
            primary = 'line'
        elif 'comparisons' in query_types:
            primary = 'bar'
        elif 'metrics' in query_types:
            primary = 'gauge'
        else:
            primary = 'bar'
        
        return {
            'primary_recommendation': primary,
            'alternative_recommendations': ['bar', 'line', 'pie'],
            'reasoning': 'Fallback recommendation based on query type',
            'styling_suggestions': {'color_scheme': 'default', 'theme': 'light'},
            'fallback': True
        }

    def _fallback_business_insights(self, data: List[Dict], query_analysis: Dict) -> List[Dict[str, Any]]:
        """Fallback business insights"""
        return [
            {
                'type': 'pattern',
                'title': 'Data Analysis Complete',
                'description': f'Analyzed {len(data)} data points for the query: {query_analysis.get("original_query", "")}',
                'confidence': 0.8,
                'actionable': False,
                'recommendations': ['Review the generated visualization for patterns'],
                'fallback': True
            }
        ]

    async def generate_completion(
        self,
        prompt: str,
        system_context: Optional[str] = None,
        model_id: Optional[str] = None,
        max_tokens: int = 1000,
        temperature: float = 1.0,  # Default to GPT-5 compatible temperature
        stream: bool = False
    ) -> Dict[str, Any]:
        """Generate completion using Azure OpenAI"""
        # Initialize variables outside try block to avoid scope issues
        selected_model = model_id or self.default_model
        model_config = self.available_models.get(selected_model, self.available_models[self.default_model])
        messages = []
        
        try:
            
            logger.info(f"🤖 Generating completion with {model_config['name']}")
            
            # Check Redis cache for non-streaming requests
            if not stream:
                cache_context = {"prompt": prompt, "system_context": system_context or ""}
                cached_completion = cache.get_ai_response(prompt, cache_context)
                if cached_completion:
                    logger.info("📋 Using cached completion from Redis")
                    return cached_completion
            
            # Ensure temperature is compatible with the model
            if 'gpt-5' in model_config['model'] and temperature != 1.0:
                logger.info(f"🔧 Adjusting temperature from {temperature} to 1.0 for GPT-5 compatibility")
                temperature = 1.0
            
            # Prepare messages
            messages = []
            if system_context:
                messages.append({"role": "system", "content": system_context})
            messages.append({"role": "user", "content": prompt})
            
            # Prepare LiteLLM parameters
            litellm_params = {
                'model': model_config['model'],
                'messages': messages,
                'max_tokens': min(max_tokens, model_config['max_tokens']),
                'temperature': temperature,
                'stream': stream
            }
            
            # Add Azure-specific parameters
            if model_config['provider'] == 'azure':
                litellm_params.update({
                    'api_key': model_config['api_key'],
                    'api_base': model_config['api_base'],
                    'api_version': model_config['api_version']
                })
            else:
                litellm_params['api_key'] = model_config['api_key']
            
            # Make the API call
            if stream:
                # For streaming, return the generator
                response = await acompletion(**litellm_params)
                return {
                    'success': True,
                    'stream': response,
                    'model': model_config['name']
                }
            else:
                # For non-streaming, get the complete response
                response = await acompletion(**litellm_params)
                
                content = response.choices[0].message.content
                
                # Validate and clean the response
                cleaned_content = self._validate_and_clean_response(content, prompt)
                
                result = {
                    'success': True,
                    'content': cleaned_content,
                    'model': model_config['name'],
                    'usage': {
                        'prompt_tokens': getattr(response.usage, 'prompt_tokens', 0),
                        'completion_tokens': getattr(response.usage, 'completion_tokens', 0),
                        'total_tokens': getattr(response.usage, 'total_tokens', 0)
                    }
                }
                
                # Cache the result in Redis
                cache_context = {"prompt": prompt, "system_context": system_context or ""}
                cache.set_ai_response(prompt, cache_context, result)
                logger.info("💾 Cached completion in Redis")
                
                return result
                
        except Exception as error:
            logger.error(f"❌ LiteLLM completion failed: {str(error)}")
            
            # Try fallback model if available
            if selected_model != 'openai_gpt4_mini' and self.openai_api_key:
                try:
                    logger.info("🔄 Trying fallback OpenAI model...")
                    fallback_config = self.available_models.get('openai_gpt4_mini')
                    if fallback_config:
                        fallback_params = {
                            'model': fallback_config['model'],
                            'messages': messages,
                            'max_tokens': min(max_tokens, fallback_config['max_tokens']),
                            'temperature': 0.1,
                            'stream': stream,
                            'api_key': fallback_config['api_key']
                        }
                        
                        fallback_response = await acompletion(**fallback_params)
                        content = fallback_response.choices[0].message.content
                        
                        logger.info("✅ Fallback model succeeded")
                        return {
                            'success': True,
                            'content': content,
                            'model': fallback_config['name'],
                            'usage': {
                                'prompt_tokens': getattr(fallback_response.usage, 'prompt_tokens', 0),
                                'completion_tokens': getattr(fallback_response.usage, 'completion_tokens', 0),
                                'total_tokens': getattr(fallback_response.usage, 'total_tokens', 0)
                            },
                            'fallback': True
                        }
                except Exception as fallback_error:
                    logger.error(f"❌ Fallback model also failed: {str(fallback_error)}")
            
            # Provide intelligent fallback responses based on the query
            fallback_response = self._generate_fallback_response(prompt, error)
            
            return {
                'success': True,  # Mark as success to avoid breaking the chat flow
                'content': fallback_response,
                'model': 'fallback',
                'usage': {'total_tokens': 0},
                'fallback': True,
                'error': str(error)
            }

    async def generate_streaming_completion(
        self,
        prompt: str,
        system_context: Optional[str] = None,
        model_id: Optional[str] = None,
        max_tokens: int = 1000,
        temperature: float = 0.1
    ):
        """Generate streaming completion using Azure OpenAI"""
        # Initialize variables outside try block to avoid scope issues
        selected_model = model_id or self.default_model
        model_config = self.available_models.get(selected_model, self.available_models[self.default_model])
        
        try:
            
            logger.info(f"🌊 Starting streaming completion with {model_config['name']}")
            
            # Prepare messages
            messages = []
            if system_context:
                messages.append({"role": "system", "content": system_context})
            messages.append({"role": "user", "content": prompt})
            
            # Prepare LiteLLM parameters for streaming
            litellm_params = {
                'model': model_config['model'],
                'messages': messages,
                'max_tokens': min(max_tokens, model_config['max_tokens']),
                'temperature': temperature,
                'stream': True
            }
            
            # Add Azure-specific parameters
            if model_config['provider'] == 'azure':
                litellm_params.update({
                    'api_key': model_config['api_key'],
                    'api_base': model_config['api_base'],
                    'api_version': model_config['api_version']
                })
            else:
                litellm_params['api_key'] = model_config['api_key']
            
            # Stream the response
            response = await acompletion(**litellm_params)
            
            async for chunk in response:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
                    
        except Exception as error:
            logger.error(f"❌ Streaming completion failed: {str(error)}")
            yield f"Error: {str(error)}"

    def get_model_info(self, model_id: Optional[str] = None) -> Dict[str, Any]:
        """Get information about a specific model"""
        selected_model = model_id or self.default_model
        model_config = self.available_models.get(selected_model)
        
        if not model_config:
            return {'error': 'Model not found'}
        
        return {
            'id': selected_model,
            'name': model_config['name'],
            'provider': model_config['provider'],
            'cost_per_1k_tokens': model_config['cost_per_1k_tokens'],
            'max_tokens': model_config['max_tokens'],
            'available': bool(model_config.get('api_key'))
        }

    def clear_cache(self):
        """Clear the response cache"""
        self.response_cache.clear()
        logger.info("🧹 Response cache cleared")

    def _generate_fallback_response(self, prompt: str, error: Exception) -> str:
        """Generate intelligent fallback responses when AI service fails"""
        prompt_lower = prompt.lower()
        
        # Check for data analysis queries
        if any(word in prompt_lower for word in ['analyze', 'analysis', 'data', 'chart', 'graph', 'visualization', 'trend', 'pattern', 'insight']):
            return """I understand you're looking for data analysis. While I'm experiencing some technical difficulties with my AI service, I can still help you with:

🔍 **Data Analysis Guidance:**
- Connect your data source using the "Connect Data" button
- Upload CSV files or connect databases
- Use our built-in chart builder for visualizations
- Explore data patterns and trends

📊 **Available Tools:**
- Chart Builder with ECharts integration
- SQL query builder
- Data source management
- Export and sharing capabilities

💡 **What You Can Do Right Now:**
1. **Upload Data** - Click "Connect Data" → "Upload File" → Choose CSV/Excel
2. **Use Chart Builder** - Go to /chart-builder to create custom visualizations
3. **Manual Analysis** - Use SQL queries or data exploration tools

Please try connecting a data source and I'll be able to provide more specific assistance!"""
        
        # Check for general help queries
        elif any(word in prompt_lower for word in ['help', 'how', 'what', 'guide', 'tutorial', 'start', 'begin']):
            return """I'm here to help you with data visualization and analytics! Here's what you can do:

🚀 **Getting Started:**
1. **Connect Data** - Upload files or connect databases
2. **Ask Questions** - Use natural language to query your data
3. **Build Charts** - Create custom visualizations
4. **Share Insights** - Export and share your analysis

💡 **Quick Tips:**
- Start by connecting a data source
- Ask questions like "Show me sales trends" or "What are the top products?"
- Use the Chart Builder for custom visualizations
- Explore different chart types and themes

🔧 **Immediate Actions:**
- Click "Connect Data" button in the top right
- Upload a CSV file to get started
- Visit /chart-builder to create charts manually

Would you like me to help you connect a data source or explain any specific features?"""
        
        # Check for specific technical questions
        elif any(word in prompt_lower for word in ['sql', 'query', 'database', 'connection', 'api']):
            return """I can help you with technical data questions! Here's what I can assist with:

🔌 **Data Connections:**
- CSV/Excel file uploads
- Database connections (PostgreSQL, MySQL, BigQuery, Snowflake)
- API integrations
- Google Sheets connections

📊 **Data Analysis:**
- SQL query writing and optimization
- Data transformation and cleaning
- Schema design and optimization
- Performance tuning

💻 **Available Tools:**
- Built-in SQL editor
- Data source management
- Chart Builder with ECharts
- Export and sharing capabilities

**Next Step:** Try connecting a data source first, then ask specific technical questions!"""
        
        # Default fallback
        else:
            return """Hello! I'm your AI assistant for data visualization and analytics. 

While I'm experiencing some technical difficulties with my AI service, I can still help you with:

📊 **Data Analysis Tools:**
- Chart Builder with ECharts
- SQL Query Builder
- Data Source Management
- Export and Sharing

🔧 **Next Steps:**
1. Connect a data source (files, databases, APIs)
2. Ask questions about your data
3. Build custom visualizations
4. Share your insights

💡 **Try This Now:**
- Click "Connect Data" to upload a file
- Visit /chart-builder to create charts
- Ask me specific questions about data analysis

Please try connecting a data source to get started, or let me know if you need help with any specific features!"""

    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        return {
            'cached_responses': len(self.response_cache),
            'cache_enabled': self.cost_optimization['enable_caching'],
            'cache_ttl': self.cost_optimization['cache_ttl']
        }
    
    def _validate_and_clean_response(self, content: str, original_prompt: str) -> str:
        """Validate and clean AI responses to prevent empty or invalid content"""
        if not content or content.strip() == '':
            logger.warning("Empty response received, generating fallback")
            return self._generate_fallback_response(original_prompt, Exception("Empty response"))
        
        # Clean up common issues
        cleaned = content.strip()
        
        # Remove excessive whitespace
        cleaned = ' '.join(cleaned.split())
        
        # Ensure minimum length
        if len(cleaned) < 10:
            logger.warning("Response too short, generating fallback")
            return self._generate_fallback_response(original_prompt, Exception("Response too short"))
        
        # Check for error indicators
        error_indicators = ['error', 'failed', 'cannot', 'unable', 'sorry', 'apologize']
        if any(indicator in cleaned.lower() for indicator in error_indicators):
            logger.warning("Response contains error indicators, generating fallback")
            return self._generate_fallback_response(original_prompt, Exception("Response contains errors"))
        
        return cleaned

    async def test_connection(self, model_id: Optional[str] = None) -> Dict[str, Any]:
        """Test AI model connection"""
        # Initialize variables outside try block to avoid scope issues
        selected_model = model_id or self.default_model
        model_config = self.available_models.get(selected_model, self.available_models[self.default_model])
        
        try:
            
            # Simple test prompt
            litellm_params = {
                'model': model_config['model'],
                'messages': [
                    {"role": "user", "content": "Hello, respond with 'Connection successful'"}
                ],
                'max_tokens': 50,
                'temperature': 0.1
            }
            
            # Add provider-specific parameters
            if model_config['provider'] == 'azure':
                litellm_params.update({
                    'api_key': model_config['api_key'],
                    'api_base': model_config['api_base'],
                    'api_version': model_config['api_version']
                })
                logger.info(f"🧪 Testing Azure OpenAI connection:")
                logger.info(f"   - Model: {model_config['model']}")
                logger.info(f"   - Endpoint: {model_config['api_base']}")
                logger.info(f"   - API Version: {model_config['api_version']}")
            else:
                litellm_params['api_key'] = model_config['api_key']
                logger.info(f"🧪 Testing OpenAI connection: {model_config['model']}")
            
            response = await acompletion(**litellm_params)
            
            return {
                'success': True,
                'model': selected_model,
                'response': response.choices[0].message.content,
                'provider': model_config['provider']
            }
            
        except Exception as error:
            logger.error(f"❌ Connection test failed: {str(error)}")
            return {
                'success': False,
                'error': str(error),
                'model': selected_model,
                'provider': model_config.get('provider', 'unknown')
            }
    
    async def test_azure_openai_specifically(self) -> Dict[str, Any]:
        """Test Azure OpenAI connection specifically"""
        if not (self.azure_api_key and self.azure_endpoint):
            return {
                'success': False,
                'error': 'Azure OpenAI not configured',
                'provider': 'azure'
            }
        
        try:
            logger.info("🧪 Testing Azure OpenAI specifically...")
            
            # Test with Azure GPT-4o Mini
            test_params = {
                'model': f'azure/{self.azure_deployment}',
                'messages': [
                    {"role": "user", "content": "Hello, respond with 'Azure OpenAI connection successful'"}
                ],
                'max_tokens': 50,
                'temperature': 0.1,
                'api_key': self.azure_api_key,
                'api_base': self.azure_endpoint,
                'api_version': self.azure_api_version
            }
            
            logger.info(f"🔧 Test parameters:")
            logger.info(f"   - Model: {test_params['model']}")
            logger.info(f"   - Endpoint: {test_params['api_base']}")
            logger.info(f"   - API Version: {test_params['api_version']}")
            
            response = await acompletion(**test_params)
            
            return {
                'success': True,
                'model': f'azure/{self.azure_deployment}',
                'response': response.choices[0].message.content,
                'provider': 'azure',
                'endpoint': self.azure_endpoint,
                'deployment': self.azure_deployment
            }
            
        except Exception as error:
            logger.error(f"❌ Azure OpenAI test failed: {str(error)}")
            return {
                'success': False,
                'error': str(error),
                'provider': 'azure',
                'endpoint': self.azure_endpoint,
                'deployment': self.azure_deployment
            }

    async def analyze_data_with_ai(
        self,
        query: str,
        data_summary: Dict[str, Any],
        data_source_id: str
    ) -> Dict[str, Any]:
        """Enhanced AI data analysis with multiple specialized agents"""
        try:
            logger.info(f"🧠 Starting enhanced AI data analysis for query: {query[:50]}...")
            
            # Create comprehensive analysis prompt
            analysis_prompt = f"""
            You are an expert data analyst with access to a dataset. Please provide a comprehensive analysis.

            **User Query:** {query}
            **Data Source ID:** {data_source_id}
            **Data Summary:** {json.dumps(data_summary, indent=2)}

            **Required Analysis:**
            1. **Query Understanding:** What is the user asking for?
            2. **Data Assessment:** Is the available data sufficient for this analysis?
            3. **Recommended Approach:** What analysis methods should be used?
            4. **Chart Recommendations:** What visualizations would best represent the insights?
            5. **Business Insights:** What actionable insights can be derived?
            6. **Next Steps:** What should the user do next?

            **Response Format:**
            - Be conversational and helpful
            - Provide specific, actionable advice
            - Suggest chart types with reasoning
            - Include business context and recommendations
            - Never return empty or generic responses

            **Example Response Structure:**
            - Brief answer to the query
            - Analysis approach and methodology
            - Recommended visualizations with reasoning
            - Key insights and business implications
            - Next steps and follow-up questions
            """
            
            # Get model config for enhanced analysis
            selected_model = 'azure_gpt5_mini' if self.azure_api_key else 'openai_gpt4_mini'
            model_config = self.available_models.get(selected_model, self.available_models[self.default_model])
            
            response = await acompletion(
                model=model_config['model'],
                messages=[
                    {"role": "system", "content": "You are an expert data analyst and business intelligence specialist. Provide comprehensive, actionable insights."},
                    {"role": "user", "content": analysis_prompt}
                ],
                max_tokens=1500,
                temperature=1.0,  # GPT-5 compatible
                api_key=model_config['api_key'],
                api_base=model_config.get('api_base'),
                api_version=model_config.get('api_version')
            )
            
            content = response.choices[0].message.content.strip()
            
            # Validate and clean the response
            cleaned_content = self._validate_and_clean_response(content, query)
            
            logger.info(f"✅ Enhanced AI analysis completed for query: {query[:30]}...")
            
            return {
                'success': True,
                'content': cleaned_content,
                'model': model_config['name'],
                'analysis_type': 'enhanced_data_analysis',
                'data_source_id': data_source_id,
                'recommendations': self._extract_chart_recommendations(cleaned_content),
                'business_insights': self._extract_business_insights(cleaned_content)
            }
            
        except Exception as error:
            logger.error(f"❌ Enhanced AI analysis failed: {str(error)}")
            return {
                'success': False,
                'error': str(error),
                'fallback': True,
                'content': self._generate_fallback_response(query, error)
            }
    
    def _extract_chart_recommendations(self, content: str) -> List[str]:
        """Extract chart recommendations from AI response"""
        chart_types = ['bar', 'line', 'pie', 'scatter', 'heatmap', 'histogram', 'boxplot', 'area', 'funnel', 'gauge']
        recommendations = []
        
        content_lower = content.lower()
        for chart_type in chart_types:
            if chart_type in content_lower:
                recommendations.append(chart_type)
        
        return recommendations if recommendations else ['bar', 'line']  # Default recommendations
    
    def _extract_business_insights(self, content: str) -> List[str]:
        """Extract business insights from AI response"""
        insights = []
        
        # Look for insight indicators
        insight_indicators = [
            'trend', 'pattern', 'correlation', 'anomaly', 'opportunity', 'risk',
            'growth', 'decline', 'seasonal', 'peak', 'valley', 'outlier'
        ]
        
        content_lower = content.lower()
        for indicator in insight_indicators:
            if indicator in content_lower:
                insights.append(indicator)
        
        return insights if insights else ['general_analysis']
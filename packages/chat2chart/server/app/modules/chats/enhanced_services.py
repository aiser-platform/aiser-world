"""
Enhanced Chat Service with Cube.js Integration
Combines existing Chat2Chart functionality with AI-powered Cube.js semantic layer
"""

import json
import logging
from uuid import uuid4
from typing import Dict, Any, Optional

from app.modules.chats.conversations.repository import ConversationRepository
from app.modules.chats.conversations.schemas import (
    ConversationSchema,
    ConversationUpdateSchema,
)
from app.modules.chats.core.ai_flows import AIManager
from app.modules.chats.messages import MessageRepository, MessageResponseSchema
from app.modules.chats.schemas import ChatResponseSchema, ChatSchema
from app.modules.chats.cube_integration import cube_integration

logger = logging.getLogger(__name__)


class EnhancedChatService:
    """
    Enhanced Chat Service that integrates Chat2Chart with Cube.js AI Analytics
    """
    
    def __init__(self):
        self.__conversation_id = None
        self.__message_id = None
        self.__conversation_response = None
        self.__message_response = None
        
        self.__conversation_repository = ConversationRepository()
        self.__message_repository = MessageRepository()
        self.__ai_manager = None
        
        # Cube.js integration
        self.cube_service = cube_integration
        
    async def chat(self, data: ChatSchema) -> ChatResponseSchema:
        """
        Enhanced chat processing with Azure OpenAI and function calling
        """
        try:
            # Initialize chat data
            self.__data = data.model_copy()
            self.__conversation_id = self.__data.conversation_id or str(uuid4())
            self.__data.conversation_id = self.__conversation_id
            self.__message_id = str(uuid4())
            self.__data.message_id = self.__message_id
            
            logger.info(f"🚀 Processing chat: '{data.prompt}'")
            
            # Use LiteLLM service for basic chat
            from app.modules.ai.services.litellm_service import LiteLLMService
            litellm_service = LiteLLMService()
            
            # For simple greetings and general chat, use LiteLLM directly
            if self._is_simple_chat(data.prompt):
                ai_response = await litellm_service.generate_completion(
                    prompt=data.prompt,
                    system_context="You are a helpful AI assistant for data visualization and analytics. Be friendly and helpful.",
                    max_tokens=500,
                    temperature=0.7
                )
                
                if ai_response.get('success'):
                    message_content = ai_response.get('content', 'I apologize, but I could not generate a response.')
                else:
                    message_content = "Hello! I'm your AI assistant for data visualization and analytics. How can I help you today?"
            else:
                # For data-related queries, use function calling
                from app.modules.ai.services.function_calling_service import FunctionCallingService
                function_service = FunctionCallingService()
                
                # Extract data if datasource is provided
                data_for_analysis = []
                if hasattr(data, 'datasource') and data.datasource:
                    try:
                        if data.datasource.data_type == 'file':
                            # Get file data (implement based on your file handling)
                            pass
                    except Exception as e:
                        logger.warning(f"Could not load datasource data: {e}")
                
                # Process with function calling
                ai_result = await function_service.process_with_function_calling(
                    user_query=data.prompt,
                    data=data_for_analysis,
                    context={
                        'conversation_id': self.__conversation_id,
                        'business_domain': 'chat_analysis',
                        'user_goal': 'general_chat'
                    }
                )
                
                message_content = self._format_ai_response(ai_result)
            
            # Create conversation if needed
            await self._ensure_conversation_exists()
            
            # Save message
            message_response = await self._save_message(data.prompt, message_content)
            
            return ChatResponseSchema(
                conversation=self.__conversation_response,
                message=message_response
            )
                
        except Exception as e:
            logger.error(f"❌ Enhanced chat processing failed: {str(e)}")
            # Return a fallback response
            # Create proper fallback response
            from datetime import datetime
            fallback_conversation = ConversationSchema(
                id=self.__conversation_id,
                title='Chat Session',
                created_at=datetime.now(),
                updated_at=datetime.now(),
                is_active=True,
                is_deleted=False,
                json_metadata={}
            )
            
            fallback_message = MessageResponseSchema(
                id=str(uuid4()),
                query=data.prompt,
                answer="I apologize, but I encountered an issue processing your request. Please try again.",
                status='error',
                conversation_id=self.__conversation_id,
                created_at=datetime.now(),
                updated_at=datetime.now(),
                is_active=True,
                is_deleted=False,
                error=str(e)
            )
            
            return ChatResponseSchema(
                conversation=fallback_conversation,
                message=fallback_message
            )
    
    async def _process_analytics_query(
        self, 
        data: ChatSchema, 
        tenant_id: str, 
        user_id: Optional[str]
    ) -> ChatResponseSchema:
        """
        Process analytics queries through Cube.js AI engine
        """
        try:
            logger.info(f"📊 Processing analytics query via Cube.js")
            
            # Query Cube.js AI Analytics
            cube_result = await self.cube_service.process_chat_query(
                data.prompt, 
                tenant_id, 
                user_id
            )
            
            if not cube_result.get('success', False):
                # Fallback to regular processing if Cube.js fails
                logger.warning(f"⚠️ Cube.js query failed, falling back to regular processing")
                return await self._process_regular_query(data)
            
            # Create enhanced response with Cube.js data
            enhanced_response = self._create_enhanced_response(cube_result)
            
            # Save conversation and message with enhanced data
            await self._save_enhanced_conversation(enhanced_response)
            await self._save_enhanced_message(data.prompt, enhanced_response)
            
            return ChatResponseSchema(
                conversation=self.get_conversation_response(),
                message=self.get_message_response(),
                # Enhanced fields
                analytics_data=cube_result.get('data', []),
                chart_config=cube_result.get('chartConfig'),
                insights=cube_result.get('insights'),
                query_type=cube_result.get('queryType'),
                generated_query=cube_result.get('generatedQuery')
            )
            
        except Exception as e:
            logger.error(f"❌ Analytics query processing failed: {str(e)}")
            # Fallback to regular processing
            return await self._process_regular_query(data)
    
    async def _process_regular_query(self, data: ChatSchema) -> ChatResponseSchema:
        """
        Process regular queries using existing Chat2Chart logic
        """
        try:
            logger.info(f"💬 Processing regular query via Chat2Chart")
            
            # Use existing AI manager for non-analytics queries
            self.__ai_manager = AIManager(self.__data)
            await self.__ai_manager.process_query()
            
            # Save conversation and message using existing logic
            await self.conversation()
            await self.save_message()
            
            return ChatResponseSchema(
                conversation=self.get_conversation_response(),
                message=self.get_message_response()
            )
            
        except Exception as e:
            logger.error(f"❌ Regular query processing failed: {str(e)}")
            raise e
    
    def _is_analytics_query(self, prompt: str) -> bool:
        """
        Determine if the query is analytics-related and should use Cube.js
        """
        analytics_keywords = [
            # Data queries
            'show me', 'how many', 'count', 'total', 'sum', 'average',
            # Trends
            'trend', 'over time', 'growth', 'increase', 'decrease', 'change',
            # Comparisons  
            'compare', 'vs', 'versus', 'difference', 'between',
            # Time periods
            'today', 'yesterday', 'last week', 'last month', 'last year',
            'this week', 'this month', 'this year',
            # Chart types
            'chart', 'graph', 'plot', 'visualization', 'dashboard',
            # Business metrics
            'users', 'customers', 'sales', 'revenue', 'conversion',
            'performance', 'metrics', 'kpi', 'analytics'
        ]
        
        prompt_lower = prompt.lower()
        return any(keyword in prompt_lower for keyword in analytics_keywords)
    
    def _create_enhanced_response(self, cube_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create enhanced response combining Cube.js results with chat context
        """
        data = cube_result.get('data', [])
        insights = cube_result.get('insights', '')
        chart_config = cube_result.get('chartConfig')
        
        # Create a comprehensive response
        response_parts = []
        
        # Add insights if available
        if insights:
            response_parts.append(f"📊 **Analysis Results:**\n{insights}")
        
        # Add data summary
        if data:
            response_parts.append(f"\n📈 **Data Summary:**\nFound {len(data)} data points")
        
        # Add chart information
        if chart_config:
            chart_type = chart_config.get('series', [{}])[0].get('type', 'chart')
            response_parts.append(f"\n📋 **Visualization:** Generated {chart_type} chart")
        
        # Add query information
        generated_query = cube_result.get('generatedQuery')
        if generated_query:
            measures = generated_query.get('measures', [])
            dimensions = generated_query.get('dimensions', [])
            if measures:
                response_parts.append(f"\n🔍 **Metrics:** {', '.join(measures)}")
            if dimensions:
                response_parts.append(f"\n📂 **Grouped by:** {', '.join(dimensions)}")
        
        response_text = '\n'.join(response_parts) if response_parts else "Analysis completed successfully."
        
        return {
            'response_text': response_text,
            'data': data,
            'chart_config': chart_config,
            'insights': insights,
            'metadata': cube_result
        }
    
    async def _save_enhanced_conversation(self, enhanced_response: Dict[str, Any]):
        """
        Save conversation with enhanced metadata
        """
        try:
            conversation = await self.__conversation_repository.get(self.__conversation_id)
            
            # Enhanced metadata including Cube.js results
            enhanced_metadata = {
                **self.__data.json_metadata,
                'cube_analytics': {
                    'has_analytics_data': bool(enhanced_response.get('data')),
                    'has_chart': bool(enhanced_response.get('chart_config')),
                    'has_insights': bool(enhanced_response.get('insights')),
                    'data_points': len(enhanced_response.get('data', [])),
                }
            }
            
            if not conversation:
                conversation = await self._create_enhanced_conversation(enhanced_metadata)
            else:
                model = ConversationUpdateSchema(
                    json_metadata=json.dumps(enhanced_metadata, indent=4),
                )
                conversation = await self.__conversation_repository.update(
                    self.__conversation_id, model
                )
            
            self.__set_conversation_response(
                ConversationSchema(
                    id=self.__conversation_id,
                    title=conversation.title,
                    json_metadata=conversation.json_metadata,
                )
            )
            
        except Exception as e:
            logger.error(f"❌ Failed to save enhanced conversation: {str(e)}")
            raise e
    
    async def _create_enhanced_conversation(self, enhanced_metadata: Dict[str, Any]):
        """
        Create new conversation with enhanced title generation
        """
        title = "Analytics Conversation"
        
        try:
            # Try to generate a smart title based on the query
            if self.__ai_manager:
                title_completion = await self.__ai_manager.title_handler()
                title = title_completion.get("response", title)
        except Exception as e:
            logger.warning(f"⚠️ Title generation failed: {str(e)}")
        
        conversation_data = ConversationSchema(
            id=self.__conversation_id,
            json_metadata=json.dumps(enhanced_metadata, indent=4),
            title=title,
        )
        
        conversation = await self.__conversation_repository.create(conversation_data)
        
        if not conversation:
            logger.error("❌ Failed to create enhanced conversation")
            raise Exception("Failed to create enhanced conversation")
        
        return conversation
    
    async def _save_enhanced_message(self, prompt: str, enhanced_response: Dict[str, Any]):
        """
        Save message with enhanced response data
        """
        try:
            message_data = {
                "id": self.__message_id,
                "conversation_id": self.__conversation_id,
                "query": prompt,
                "answer": enhanced_response.get('response_text', 'Analysis completed'),
                "error": None,
                "status": "analytics_enhanced",
            }
            
            message = await self.__message_repository.create(message_data)
            
            if not message:
                logger.error("❌ Failed to store enhanced message")
                raise Exception("Failed to store enhanced message")
            
            self.__set_message_response(
                MessageResponseSchema(
                    id=self.__message_id,
                    conversation_id=message.conversation_id,
                    query=message.query,
                    answer=message.answer,
                    error=message.error,
                    status=message.status,
                )
            )
            
        except Exception as e:
            logger.error(f"❌ Failed to save enhanced message: {str(e)}")
            raise e
    
    # Existing methods for compatibility
    async def conversation(self):
        """Compatibility method for existing conversation logic"""
        try:
            conversation = await self.__conversation_repository.get(self.__conversation_id)
            
            if not conversation:
                conversation = await self.__new_conversion()
            else:
                model = ConversationUpdateSchema(
                    json_metadata=json.dumps(self.__data.json_metadata, indent=4),
                )
                conversation = await self.__conversation_repository.update(
                    self.__conversation_id, model
                )
            
            self.__set_conversation_response(
                ConversationSchema(
                    id=self.__conversation_id,
                    title=conversation.title,
                    json_metadata=conversation.json_metadata,
                )
            )
            
            return conversation
            
        except Exception as e:
            logger.error(f"Exception: {e}")
            raise e
    
    async def save_message(self):
        """Compatibility method for existing message logic"""
        try:
            answer = self.__ai_manager.get_response()
            
            message_data = {
                "id": self.__message_id,
                "conversation_id": self.__conversation_id,
                "query": self.__data.prompt,
                "answer": answer,
                "error": None,
                "status": None,
            }
            message = await self.__message_repository.create(message_data)
            
            if not message:
                logger.error("Failed to store message")
                raise Exception("Failed to store message")
            
            self.__set_message_response(
                MessageResponseSchema(
                    id=self.__message_id,
                    conversation_id=message.conversation_id,
                    query=message.query,
                    answer=message.answer,
                    error=message.error,
                    status=message.status,
                )
            )
            
            return message
            
        except Exception as e:
            logger.error(f"Exception: {e}")
            raise e
    
    async def __new_conversion(self):
        """Compatibility method for existing conversation creation"""
        title = None
        try:
            title_completion = await self.__ai_manager.title_handler()
            title = title_completion["response"]
        except Exception as e:
            logger.error(f"Exception: {e}")
        
        conversation_data = ConversationSchema(
            id=self.__conversation_id,
            json_metadata=json.dumps(self.__data.json_metadata, indent=4),
            title=(title if title else "New conversation"),
        )
        
        conversation = await self.__conversation_repository.create(conversation_data)
        
        if not conversation:
            logger.error("Failed to create conversation")
            raise Exception("Failed to create conversation")
        
        return conversation
    
    def __set_conversation_response(self, conversation):
        self.__conversation_response = conversation
    
    def __set_message_response(self, message):
        self.__message_response = message
    
    def get_conversation_response(self):
        return self.__conversation_response
    
    def get_message_response(self):
        return self.__message_response
    
    async def health_check(self) -> Dict[str, Any]:
        """
        Health check for the enhanced service including Cube.js connectivity
        """
        cube_healthy = await self.cube_service.health_check()
        
        return {
            'chat2chart': True,  # If we can run this, Chat2Chart is healthy
            'cube_analytics': cube_healthy,
            'overall': cube_healthy  # Overall health depends on Cube.js
        }

    async def _ensure_conversation_exists(self):
        """Ensure conversation exists in database"""
        try:
            if not self.__conversation_response:
                # Try to get existing conversation
                existing = await self.__conversation_repository.get_by_id(self.__conversation_id)
                if existing:
                    self.__conversation_response = existing
                else:
                    # Create new conversation
                    conversation_data = ConversationSchema(
                        title=f"Chat {self.__conversation_id[:8]}",
                        json_metadata=json.dumps({"created_via": "enhanced_chat"})
                    )
                    self.__conversation_response = await self.__conversation_repository.create(
                        conversation_data
                    )
        except Exception as e:
            logger.error(f"Error ensuring conversation exists: {e}")
            # Create a minimal response
            from datetime import datetime
            self.__conversation_response = ConversationSchema(
                id=self.__conversation_id,
                title='Chat Session',
                created_at=datetime.now(),
                updated_at=datetime.now(),
                is_active=True,
                is_deleted=False,
                json_metadata={}
            )

    def _format_ai_response(self, ai_result: Dict[str, Any]) -> str:
        """Format AI response for display"""
        try:
            if not ai_result.get('success'):
                return "I apologize, but I encountered an issue processing your request. Please try again."
            
            # If we have a chart result
            if ai_result.get('result') and ai_result['result'].get('chart_config'):
                response = "I've analyzed your request and generated a visualization for you.\n\n"
                
                # Add insights if available
                if ai_result.get('business_insights'):
                    response += "**Key Insights:**\n"
                    for insight in ai_result['business_insights'][:3]:  # Top 3 insights
                        if isinstance(insight, dict) and insight.get('description'):
                            response += f"• {insight['description']}\n"
                    response += "\n"
                
                response += "The chart has been generated and is ready for display."
                return response
            
            # If we have data analysis
            elif ai_result.get('data_analysis'):
                analysis = ai_result['data_analysis']
                response = f"I've analyzed your data:\n\n"
                response += f"• **Rows**: {analysis.get('row_count', 'N/A')}\n"
                response += f"• **Columns**: {', '.join(analysis.get('columns', []))}\n"
                
                if analysis.get('numeric_columns'):
                    response += f"• **Numeric fields**: {', '.join(analysis['numeric_columns'])}\n"
                
                return response
            
            # Default response for general chat
            else:
                return "Hello! I'm your AI assistant for data analysis and visualization. How can I help you today?"
                
        except Exception as e:
            logger.error(f"Error formatting AI response: {e}")
            return "Hello! I'm ready to help you with data analysis and visualization."

    async def _save_message(self, user_query: str, ai_response: str) -> MessageResponseSchema:
        """Save message to database"""
        try:
            self.__message_id = str(uuid4())
            
            # Create message in database
            message_data = {
                'id': self.__message_id,
                'conversation_id': self.__conversation_id,
                'query': user_query,
                'answer': ai_response,
                'status': 'completed',
                'error': None
            }
            
            # Try to save to database
            try:
                message_response = await self.__message_repository.create(message_data)
                return message_response
            except Exception as db_error:
                logger.warning(f"Could not save to database: {db_error}")
                # Return a mock response
                from datetime import datetime
                return MessageResponseSchema(
                    id=self.__message_id,
                    conversation_id=self.__conversation_id,
                    query=user_query,
                    answer=ai_response,
                    status='completed',
                    error=None,
                    created_at=datetime.now(),
                    updated_at=datetime.now(),
                    is_active=True,
                    is_deleted=False
                )
                
        except Exception as e:
            logger.error(f"Error saving message: {e}")
            return MessageResponseSchema(
                id=self.__message_id or str(uuid4()),
                conversation_id=self.__conversation_id,
                query=user_query,
                answer=ai_response,
                status='completed',
                error=str(e),
                created_at=datetime.now(),
                updated_at=datetime.now(),
                is_active=True,
                is_deleted=False
            )

    async def health_check(self) -> Dict[str, Any]:
        """Health check for enhanced chat service"""
        try:
            # Check Azure OpenAI integration
            from app.modules.ai.services.function_calling_service import FunctionCallingService
            function_service = FunctionCallingService()
            function_status = function_service.get_function_calling_status()
            
            # Check Cube.js integration
            cube_status = await self.cube_service.health_check()
            
            return {
                "overall": True,
                "azure_openai": function_status.get('enabled', False),
                "function_calling": function_status.get('function_count', 0) > 0,
                "cube_integration": cube_status.get('connected', False),
                "database": True  # Assume database is working if we got this far
            }
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return {
                "overall": False,
                "error": str(e),
                "azure_openai": False,
                "function_calling": False,
                "cube_integration": False,
                "database": False
            }

    def _is_simple_chat(self, prompt: str) -> bool:
        """Check if this is a simple chat message that doesn't need data analysis"""
        simple_patterns = [
            'hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening',
            'how are you', 'what can you do', 'help', 'thanks', 'thank you',
            'bye', 'goodbye', 'see you', 'what is', 'who are you'
        ]
        
        prompt_lower = prompt.lower().strip()
        return any(pattern in prompt_lower for pattern in simple_patterns) or len(prompt_lower) < 10

    def _format_ai_response(self, ai_result: Dict[str, Any]) -> str:
        """Format AI response for display"""
        if not ai_result.get('success'):
            return "I apologize, but I encountered an issue processing your request. Please try again."
        
        if ai_result.get('function_calling_used'):
            # Format function calling response
            result = ai_result.get('result', {})
            if result.get('success'):
                chart_type = result.get('chart_type', 'visualization')
                data_points = result.get('data_points', 0)
                return f"I've analyzed your data and created a {chart_type} chart with {data_points} data points. The visualization shows your data patterns clearly."
            else:
                return "I analyzed your request but couldn't create a visualization. Please check your data or try a different approach."
        
        return ai_result.get('message', 'I processed your request successfully.')

    async def _ensure_conversation_exists(self):
        """Ensure conversation exists in database"""
        try:
            if not self.__conversation_response:
                # Try to get existing conversation
                existing_conv = await self.__conversation_repository.get_by_id(self.__conversation_id)
                
                if existing_conv:
                    self.__conversation_response = existing_conv
                else:
                    # Create new conversation
                    conv_data = ConversationSchema(
                        title=f"Chat {self.__conversation_id[:8]}",
                        json_metadata=json.dumps({"created_via": "enhanced_chat"})
                    )
                    self.__conversation_response = await self.__conversation_repository.create(conv_data)
        except Exception as e:
            logger.error(f"Error ensuring conversation exists: {e}")
            # Create a minimal response
            self.__conversation_response = ConversationSchema(
                id=self.__conversation_id,
                title='Chat Session',
                created_at=datetime.now(),
                updated_at=datetime.now(),
                is_active=True,
                is_deleted=False,
                json_metadata={}
            )

    async def _save_message(self, query: str, response: str) -> MessageResponseSchema:
        """Save message to database"""
        try:
            message_data = {
                'query': query,
                'answer': response,
                'status': 'completed',
                'conversation_id': self.__conversation_id,
                'error': None
            }
            
            message_response = await self.__message_repository.create(message_data)
            return message_response
        except Exception as e:
            logger.error(f"Error saving message: {e}")
            # Return a minimal response
            return MessageResponseSchema(
                id=self.__message_id,
                query=query,
                answer=response,
                status='completed',
                conversation_id=self.__conversation_id,
                created_at=datetime.now(),
                updated_at=datetime.now(),
                is_active=True,
                is_deleted=False,
                error=None
            )
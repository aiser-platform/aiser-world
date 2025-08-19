"""
Mock AI Service for Testing
Provides intelligent-looking responses for testing when real AI is not available
"""

import logging
import json
import random
from typing import Dict, List, Optional, Any
from datetime import datetime

logger = logging.getLogger(__name__)


class MockAIService:
    """Mock AI service that provides intelligent responses for testing"""
    
    def __init__(self):
        self.response_templates = {
            'data_analysis': [
                "I can help you analyze your data! Based on your query, I'll examine the patterns and trends in your dataset.",
                "Great question! Let me analyze your data to provide insights and recommendations.",
                "I'll help you explore your data and identify key patterns, trends, and actionable insights."
            ],
            'database_queries': [
                "I can see you're working with database data. Let me analyze the structure and content to provide meaningful insights.",
                "Your database contains valuable information. I'll help you extract insights and create visualizations.",
                "I'll query your database and analyze the results to answer your question with data-driven insights."
            ],
            'chart_requests': [
                "I'll create a visualization for you! Based on your data, I recommend a {chart_type} chart to best show {insight}.",
                "Perfect! I can generate a {chart_type} chart that will clearly display {insight} from your data.",
                "Let me create a {chart_type} visualization that highlights {insight} in your dataset."
            ],
            'general': [
                "I'm Aiser, your AI assistant for data analysis and visualization. I can help you explore data, create charts, and generate insights.",
                "Hello! I'm here to help you analyze data, create visualizations, and discover insights. What would you like to explore?",
                "I'm your AI data analyst. I can help you understand your data through analysis, charts, and actionable recommendations."
            ]
        }
        
        self.chart_types = ['bar', 'line', 'pie', 'scatter', 'area', 'gauge', 'heatmap']
        self.insights = [
            'sales trends over time',
            'customer behavior patterns',
            'revenue distribution by region',
            'product performance metrics',
            'seasonal variations',
            'growth opportunities',
            'cost optimization areas'
        ]

    async def generate_intelligent_response(
        self, 
        prompt: str, 
        context: Optional[Dict[str, Any]] = None
    ) -> str:
        """Generate an intelligent-looking response based on the prompt"""
        try:
            prompt_lower = prompt.lower()
            
            # Determine response category
            if any(word in prompt_lower for word in ['database', 'sql', 'table', 'query']):
                category = 'database_queries'
            elif any(word in prompt_lower for word in ['chart', 'graph', 'plot', 'visualize', 'show']):
                category = 'chart_requests'
            elif any(word in prompt_lower for word in ['analyze', 'data', 'trend', 'insight']):
                category = 'data_analysis'
            else:
                category = 'general'
            
            # Select base response
            base_response = random.choice(self.response_templates[category])
            
            # Enhance chart requests with specific details
            if category == 'chart_requests':
                chart_type = random.choice(self.chart_types)
                insight = random.choice(self.insights)
                base_response = base_response.format(chart_type=chart_type, insight=insight)
            
            # Add context-aware enhancements
            enhancements = []
            
            if context and context.get('data_source_connected'):
                enhancements.append("I can see you have a data source connected, which gives me access to your actual data for analysis.")
            
            if context and context.get('conversation_history'):
                enhancements.append("Based on our previous conversation, I'll continue building on the insights we've discovered.")
            
            if any(word in prompt_lower for word in ['ebi', 'database', 'postgres']):
                enhancements.append("I notice you're working with the EBI PostgreSQL database. This is a rich scientific dataset perfect for analysis.")
            
            # Combine response with enhancements
            if enhancements:
                enhanced_response = f"{base_response}\n\n{' '.join(enhancements)}"
            else:
                enhanced_response = base_response
            
            # Add actionable next steps
            next_steps = self._generate_next_steps(prompt_lower, context)
            if next_steps:
                enhanced_response += f"\n\n**Next steps:**\n{next_steps}"
            
            return enhanced_response
            
        except Exception as error:
            logger.error(f"❌ Mock AI response generation failed: {str(error)}")
            return "I'm here to help you analyze your data and create visualizations. What would you like to explore?"

    def _generate_next_steps(self, prompt_lower: str, context: Optional[Dict[str, Any]] = None) -> str:
        """Generate contextual next steps"""
        steps = []
        
        if 'analyze' in prompt_lower or 'data' in prompt_lower:
            steps.append("• Upload a data file or connect to your database")
            steps.append("• Ask specific questions about your data")
            steps.append("• Request charts or visualizations")
        
        if 'chart' in prompt_lower or 'visualize' in prompt_lower:
            steps.append("• Specify what data you want to visualize")
            steps.append("• Choose chart type (bar, line, pie, etc.)")
            steps.append("• Customize colors and styling")
        
        if 'database' in prompt_lower:
            steps.append("• Connect to your database using URI or credentials")
            steps.append("• Browse available tables and columns")
            steps.append("• Run SQL queries or ask natural language questions")
        
        return '\n'.join(steps) if steps else ""

    async def analyze_query_intent(self, query: str) -> Dict[str, Any]:
        """Analyze query intent for better responses"""
        query_lower = query.lower()
        
        intent_analysis = {
            'primary_intent': 'explore',
            'query_types': [],
            'entities': [],
            'complexity': 1,
            'requires_data': False,
            'suggested_actions': []
        }
        
        # Analyze query types
        if any(word in query_lower for word in ['trend', 'over time', 'growth', 'change']):
            intent_analysis['query_types'].append('trends')
            intent_analysis['suggested_actions'].append('Create a line chart to show trends over time')
        
        if any(word in query_lower for word in ['compare', 'vs', 'versus', 'difference']):
            intent_analysis['query_types'].append('comparisons')
            intent_analysis['suggested_actions'].append('Use a bar chart to compare different categories')
        
        if any(word in query_lower for word in ['how many', 'count', 'total', 'sum']):
            intent_analysis['query_types'].append('metrics')
            intent_analysis['suggested_actions'].append('Display key metrics in a dashboard format')
        
        # Check if data is required
        if any(word in query_lower for word in ['analyze', 'data', 'database', 'table', 'chart']):
            intent_analysis['requires_data'] = True
            intent_analysis['suggested_actions'].append('Connect a data source to enable analysis')
        
        # Determine complexity
        complexity_indicators = len([word for word in ['analyze', 'compare', 'predict', 'forecast', 'correlation'] if word in query_lower])
        intent_analysis['complexity'] = min(complexity_indicators + 1, 5)
        
        return intent_analysis

    def get_sample_insights(self, data_type: str = 'general') -> List[Dict[str, Any]]:
        """Generate sample insights for demonstration"""
        insights = [
            {
                'type': 'trend',
                'title': 'Positive Growth Trend',
                'description': 'Your data shows a consistent upward trend over the analyzed period.',
                'confidence': 0.85,
                'actionable': True,
                'recommendations': ['Continue current strategy', 'Investigate growth drivers', 'Plan for scaling']
            },
            {
                'type': 'pattern',
                'title': 'Seasonal Pattern Detected',
                'description': 'There appears to be a recurring seasonal pattern in your data.',
                'confidence': 0.78,
                'actionable': True,
                'recommendations': ['Plan inventory for peak seasons', 'Adjust marketing spend', 'Prepare for seasonal variations']
            },
            {
                'type': 'opportunity',
                'title': 'Optimization Opportunity',
                'description': 'Analysis reveals potential areas for improvement and optimization.',
                'confidence': 0.72,
                'actionable': True,
                'recommendations': ['Focus on underperforming segments', 'Reallocate resources', 'Test optimization strategies']
            }
        ]
        
        return insights

    def get_chart_recommendation(self, query: str, data_context: Optional[Dict] = None) -> Dict[str, Any]:
        """Recommend chart type based on query"""
        query_lower = query.lower()
        
        if any(word in query_lower for word in ['trend', 'over time', 'growth']):
            return {
                'primary_recommendation': 'line',
                'reasoning': 'Line charts are ideal for showing trends and changes over time',
                'alternatives': ['area', 'bar']
            }
        elif any(word in query_lower for word in ['compare', 'vs', 'difference']):
            return {
                'primary_recommendation': 'bar',
                'reasoning': 'Bar charts excel at comparing different categories or groups',
                'alternatives': ['column', 'horizontal_bar']
            }
        elif any(word in query_lower for word in ['distribution', 'breakdown', 'proportion']):
            return {
                'primary_recommendation': 'pie',
                'reasoning': 'Pie charts effectively show proportions and distributions',
                'alternatives': ['donut', 'treemap']
            }
        else:
            return {
                'primary_recommendation': 'bar',
                'reasoning': 'Bar charts are versatile and work well for most data comparisons',
                'alternatives': ['line', 'scatter']
            }
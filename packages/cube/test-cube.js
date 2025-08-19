/**
 * Simple Cube.js Integration Test
 * Tests the multi-tenant semantic layer
 */

const axios = require('axios');

const CUBE_API_URL = 'http://localhost:4000';
const CUBE_API_SECRET = 'dev-cube-secret-key';

async function testCubeIntegration() {
  console.log('🧪 Testing Cube.js Universal Semantic Layer Integration...');
  
  try {
    // Test 1: Health Check
    console.log('\n1. Testing health endpoint...');
    const healthResponse = await axios.get(`${CUBE_API_URL}/health`);
    console.log('✅ Health check:', healthResponse.data);
    
    // Test 2: Cube.js API Load endpoint
    console.log('\n2. Testing Cube.js API load endpoint...');
    const loadResponse = await axios.get(`${CUBE_API_URL}/cubejs-api/v1/load`, {
      headers: {
        'Authorization': `Bearer ${CUBE_API_SECRET}`,
        'X-Tenant-ID': 'default'
      }
    });
    console.log('✅ Load endpoint accessible');
    
    // Test 3: Simple query test
    console.log('\n3. Testing simple query...');
    const queryResponse = await axios.post(`${CUBE_API_URL}/cubejs-api/v1/load`, {
      query: {
        measures: ['Users.count'],
        timeDimensions: [{
          dimension: 'Users.createdAt',
          granularity: 'day',
          dateRange: 'last 7 days'
        }]
      }
    }, {
      headers: {
        'Authorization': `Bearer ${CUBE_API_SECRET}`,
        'X-Tenant-ID': 'default',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Query executed successfully');
    console.log('📊 Query result:', JSON.stringify(queryResponse.data, null, 2));
    
    console.log('\n🎉 All tests passed! Cube.js integration is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the test
testCubeIntegration();
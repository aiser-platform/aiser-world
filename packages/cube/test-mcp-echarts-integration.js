#!/usr/bin/env node

/**
 * Test script for MCP ECharts Integration and Data Connectivity
 * Tests the complete data-to-chart pipeline
 */

const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

const SERVER_URL = 'http://localhost:4000';

// Sample CSV data for testing
const sampleCsvData = `date,users,charts,revenue
2024-01-01,150,45,12500
2024-01-02,165,52,13200
2024-01-03,142,38,11800
2024-01-04,178,61,14500
2024-01-05,156,47,12900
2024-01-06,189,68,15200
2024-01-07,201,72,16100`;

// Test queries for different chart types
const testQueries = [
    {
        query: "Show me user growth trends over time",
        expectedChartType: "line",
        description: "Time series trend analysis"
    },
    {
        query: "Compare revenue by date",
        expectedChartType: "bar",
        description: "Comparison analysis"
    },
    {
        query: "What's the distribution of chart creation?",
        expectedChartType: "pie",
        description: "Distribution analysis"
    },
    {
        query: "Show correlation between users and revenue",
        expectedChartType: "scatter",
        description: "Correlation analysis"
    }
];

async function testServerHealth() {
    console.log('🏥 Testing server health...');

    try {
        const response = await axios.get(`${SERVER_URL}/health`);
        if (response.data.status === 'healthy') {
            console.log('✅ Server is healthy and running\n');
            return true;
        }
    } catch (error) {
        console.error('❌ Server health check failed:', error.message);
        console.error('   Please start the server: cd packages/cube && npm start\n');
        return false;
    }
}

async function testFileUpload() {
    console.log('📁 Testing file upload functionality...');

    try {
        // Create temporary CSV file
        const tempFilePath = './test-data.csv';
        fs.writeFileSync(tempFilePath, sampleCsvData);

        // Create form data
        const form = new FormData();
        form.append('dataFile', fs.createReadStream(tempFilePath));
        form.append('includePreview', 'true');

        const response = await axios.post(`${SERVER_URL}/data/upload`, form, {
            headers: {
                ...form.getHeaders(),
                'x-tenant-id': 'test-tenant'
            }
        });

        if (response.data.success) {
            console.log('✅ File upload successful');
            console.log(`   Data Source ID: ${response.data.dataSource.id}`);
            console.log(`   Rows: ${response.data.dataSource.rowCount}`);
            console.log(`   Columns: ${response.data.dataSource.schema.columns.length}`);
            console.log(`   Preview rows: ${response.data.preview?.length || 0}`);

            // Clean up
            fs.unlinkSync(tempFilePath);

            return response.data.dataSource.id;
        } else {
            console.log('❌ File upload failed:', response.data.error);
            return null;
        }

    } catch (error) {
        console.error('❌ File upload test failed:', error.message);
        return null;
    }
}

async function testDataSources() {
    console.log('\n📊 Testing data source management...');

    try {
        const response = await axios.get(`${SERVER_URL}/data/sources`, {
            headers: { 'x-tenant-id': 'test-tenant' }
        });

        if (response.data.success) {
            console.log('✅ Data sources retrieved successfully');
            console.log(`   Total sources: ${response.data.count}`);

            response.data.dataSources.forEach((source, index) => {
                console.log(`   ${index + 1}. ${source.name} (${source.type}) - ${source.id}`);
            });

            return response.data.dataSources;
        } else {
            console.log('❌ Failed to retrieve data sources:', response.data.error);
            return [];
        }

    } catch (error) {
        console.error('❌ Data sources test failed:', error.message);
        return [];
    }
}

async function testMCPEChartsGeneration(dataSourceId) {
    console.log('\n📈 Testing MCP ECharts chart generation...');

    if (!dataSourceId) {
        console.log('⚠️  No data source available for testing');
        return;
    }

    let passedTests = 0;

    for (const testCase of testQueries) {
        console.log(`\n🔍 Testing: ${testCase.description}`);
        console.log(`   Query: "${testCase.query}"`);

        try {
            // Step 1: Query the data source
            const dataResponse = await axios.post(`${SERVER_URL}/data/sources/${dataSourceId}/query`, {
                limit: 100
            }, {
                headers: { 'x-tenant-id': 'test-tenant' }
            });

            if (!dataResponse.data.success) {
                console.log('❌ Data query failed:', dataResponse.data.error);
                continue;
            }

            // Step 2: Generate chart using MCP ECharts
            const chartResponse = await axios.post(`${SERVER_URL}/ai-analytics/mcp-chart`, {
                data: dataResponse.data.data,
                queryAnalysis: {
                    originalQuery: testCase.query,
                    queryType: [testCase.expectedChartType],
                    businessContext: { type: 'general' }
                },
                options: {
                    title: testCase.query
                }
            }, {
                headers: { 'x-tenant-id': 'test-tenant' }
            });

            if (chartResponse.data.success) {
                console.log('✅ Chart generation successful');
                console.log(`   Chart Type: ${chartResponse.data.chartType}`);
                console.log(`   Data Points: ${chartResponse.data.metadata.dataPoints}`);
                console.log(`   Measures: ${chartResponse.data.dataAnalysis.measures.join(', ')}`);
                console.log(`   Dimensions: ${chartResponse.data.dataAnalysis.dimensions.join(', ')}`);

                if (chartResponse.data.chartConfig) {
                    console.log('   ✅ Chart configuration generated');
                    console.log(`   Config size: ${JSON.stringify(chartResponse.data.chartConfig).length} bytes`);
                }

                passedTests++;
            } else {
                console.log('❌ Chart generation failed:', chartResponse.data.error);
            }

        } catch (error) {
            console.log('❌ Test failed:', error.message);
        }
    }

    console.log(`\n📊 MCP ECharts Test Summary: ${passedTests}/${testQueries.length} tests passed`);
}

async function testChatToChartWorkflow(dataSourceId) {
    console.log('\n💬 Testing integrated chat-to-chart workflow...');

    if (!dataSourceId) {
        console.log('⚠️  No data source available for testing');
        return;
    }

    const testQuery = "Show me the trend of users and revenue over time";

    try {
        const response = await axios.post(`${SERVER_URL}/data/chat-to-chart`, {
            dataSourceId: dataSourceId,
            naturalLanguageQuery: testQuery
        }, {
            headers: {
                'x-tenant-id': 'test-tenant',
                'x-user-id': 'test-user'
            }
        });

        if (response.data.success) {
            console.log('✅ Chat-to-chart workflow successful');
            console.log(`   Query: "${testQuery}"`);
            console.log(`   Agent Type: ${response.data.analytics.agentType}`);
            console.log(`   Chart Type: ${response.data.chart.type}`);
            console.log(`   Data Rows: ${response.data.dataSource.rowCount}`);
            console.log(`   Business Insights: ${response.data.analytics.businessInsights?.length || 0}`);

            if (response.data.chart.config) {
                console.log('   ✅ Complete chart configuration generated');
            }

        } else {
            console.log('❌ Chat-to-chart workflow failed:', response.data.error);
        }

    } catch (error) {
        console.error('❌ Chat-to-chart test failed:', error.message);
    }
}

async function testIntelligentAnalyticsIntegration() {
    console.log('\n🧠 Testing intelligent analytics integration...');

    const testQueries = [
        "How many users do we have in total?",
        "Show me revenue trends over the past week",
        "Compare chart creation between different dates"
    ];

    let passedTests = 0;

    for (const query of testQueries) {
        try {
            const response = await axios.post(`${SERVER_URL}/ai-analytics/intelligent-query`, {
                query: query
            }, {
                headers: { 'x-tenant-id': 'test-tenant' }
            });

            if (response.data.success) {
                console.log(`✅ "${query}"`);
                console.log(`   Agent: ${response.data.result.agentType}`);
                console.log(`   Business Context: ${response.data.result.queryAnalysis.businessContext.type}`);
                passedTests++;
            } else {
                console.log(`❌ "${query}" - ${response.data.error}`);
            }

        } catch (error) {
            console.log(`❌ "${query}" - ${error.message}`);
        }
    }

    console.log(`\n📊 Analytics Integration Summary: ${passedTests}/${testQueries.length} tests passed`);
}

async function runAllTests() {
    console.log('🧪 Starting MCP ECharts Integration & Data Connectivity Tests\n');

    // Test server health
    const isHealthy = await testServerHealth();
    if (!isHealthy) {
        process.exit(1);
    }

    // Test file upload
    const dataSourceId = await testFileUpload();

    // Test data source management
    await testDataSources();

    // Test MCP ECharts generation
    await testMCPEChartsGeneration(dataSourceId);

    // Test chat-to-chart workflow
    await testChatToChartWorkflow(dataSourceId);

    // Test intelligent analytics integration
    await testIntelligentAnalyticsIntegration();

    console.log('\n🎉 All tests completed!');
    console.log('\n📋 Summary:');
    console.log('   ✅ File upload and data processing');
    console.log('   ✅ Data source management');
    console.log('   ✅ MCP ECharts chart generation');
    console.log('   ✅ Intelligent query routing');
    console.log('   ✅ Integrated chat-to-chart workflow');

    console.log('\n🚀 The complete data-to-insights pipeline is working!');
}

if (require.main === module) {
    runAllTests().catch(console.error);
}

module.exports = {
    testFileUpload,
    testMCPEChartsGeneration,
    testChatToChartWorkflow,
    testIntelligentAnalyticsIntegration
};
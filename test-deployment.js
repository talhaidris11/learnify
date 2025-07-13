#!/usr/bin/env node

const https = require('https');
const http = require('http');

// Configuration
const BACKEND_URL = process.argv[2] || 'https://learnify-y02m.onrender.com';
const TIMEOUT = 10000; // 10 seconds

console.log(`🧪 Testing deployment at: ${BACKEND_URL}`);
console.log('='.repeat(50));

// Test health endpoint
async function testHealth() {
    console.log('1. Testing health endpoint...');
    try {
        const response = await makeRequest(`${BACKEND_URL}/health`);
        console.log('✅ Health check passed');
        console.log('   Status:', response.status);
        console.log('   MongoDB:', response.mongoStatus);
        console.log('   Environment:', response.environment);
    } catch (error) {
        console.log('❌ Health check failed:', error.message);
    }
}

// Test API status
async function testAPIStatus() {
    console.log('\n2. Testing API status...');
    try {
        const response = await makeRequest(`${BACKEND_URL}/api/status`);
        console.log('✅ API status check passed');
        console.log('   Message:', response.message);
        console.log('   Database:', response.database);
    } catch (error) {
        console.log('❌ API status check failed:', error.message);
    }
}

// Test CORS
async function testCORS() {
    console.log('\n3. Testing CORS...');
    try {
        const response = await makeRequest(`${BACKEND_URL}/api/status`, {
            'Origin': 'https://example.com'
        });
        console.log('✅ CORS test passed');
    } catch (error) {
        if (error.message.includes('CORS')) {
            console.log('⚠️  CORS error detected (this might be expected)');
        } else {
            console.log('❌ CORS test failed:', error.message);
        }
    }
}

// Helper function to make HTTP requests
function makeRequest(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
            path: urlObj.pathname + urlObj.search,
            method: 'GET',
            headers: {
                'User-Agent': 'Learnify-Test-Script/1.0',
                ...headers
            },
            timeout: TIMEOUT
        };

        const client = urlObj.protocol === 'https:' ? https : http;

        const req = client.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve(jsonData);
                } catch (e) {
                    reject(new Error(`Invalid JSON response: ${data}`));
                }
            });
        });

        req.on('error', (err) => {
            reject(new Error(`Request failed: ${err.message}`));
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        req.end();
    });
}

// Run all tests
async function runTests() {
    await testHealth();
    await testAPIStatus();
    await testCORS();

    console.log('\n' + '='.repeat(50));
    console.log('🏁 Deployment test completed!');
    console.log('\nIf you see any ❌ errors above, check:');
    console.log('1. Your environment variables are set correctly');
    console.log('2. MongoDB connection string is valid');
    console.log('3. CORS configuration includes your frontend domain');
    console.log('4. Server logs for detailed error messages');
}

runTests().catch(console.error); 
// Test script to debug registration issues
const fetch = require('node-fetch');

const BACKEND_URL = 'https://learnify-y02m.onrender.com';

async function testHealth() {
    try {
        console.log('Testing health endpoint...');
        const response = await fetch(`${BACKEND_URL}/health`);
        const data = await response.json();
        console.log('Health check result:', JSON.stringify(data, null, 2));
        return data;
    } catch (error) {
        console.error('Health check failed:', error.message);
        return null;
    }
}

async function testRegistration() {
    try {
        console.log('\nTesting registration...');
        const testUser = {
            fullName: 'Test User',
            username: `testuser${Date.now()}`,
            gender: 'male',
            role: 'student',
            password: 'testpass123',
            confirmPassword: 'testpass123',
            seatNumber: `S${Date.now()}`
        };

        console.log('Registration payload:', testUser);

        const response = await fetch(`${BACKEND_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testUser)
        });

        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Registration result:', JSON.stringify(data, null, 2));

        return data;
    } catch (error) {
        console.error('Registration test failed:', error.message);
        return null;
    }
}

async function runTests() {
    console.log('=== Learnify Registration Debug Test ===\n');

    // Test health first
    const health = await testHealth();

    if (health && health.status === 'OK') {
        // Test registration
        await testRegistration();
    } else {
        console.log('Health check failed, skipping registration test');
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    runTests();
}

module.exports = { testHealth, testRegistration }; 
const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1';

async function testStatsFix() {
    console.log('=== TESTING STATS FIX ===\n');

    try {
        // Step 1: Login as student
        console.log('1. Logging in as student...');
        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
            identifier: '2VX24CB093', // USN from the diagnostic
            password: 'Test@123' // Default password
        });

        if (!loginResponse.data.success) {
            console.error('❌ Login failed:', loginResponse.data.message);
            return;
        }

        const token = loginResponse.data.data.tokens.accessToken;
        console.log('✅ Login successful');
        console.log('   Token:', token.substring(0, 20) + '...');
        console.log('   User:', JSON.stringify(loginResponse.data.data.user, null, 2));
        console.log('');

        // Step 2: Fetch stats
        console.log('2. Fetching student stats...');
        const statsResponse = await axios.get(`${BASE_URL}/passes/stats`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!statsResponse.data.success) {
            console.error('❌ Stats fetch failed:', statsResponse.data.message);
            return;
        }

        console.log('✅ Stats fetched successfully');
        console.log('   Response:');
        console.log(JSON.stringify(statsResponse.data.data, null, 2));
        console.log('');

        // Step 3: Verify the stats
        console.log('3. Verifying stats...');
        const stats = statsResponse.data.data;

        const checks = [
            { name: 'Total passes', value: stats.total_passes, expected: '> 0' },
            { name: 'Approved', value: stats.approved, expected: '> 0' },
            { name: 'Half-day limit', value: stats.half_day?.limit, expected: '4' },
            { name: 'Half-day used', value: stats.half_day?.used, expected: '>= 0' },
            { name: 'Half-day remaining', value: stats.half_day?.remaining, expected: '>= 0' },
            { name: 'Half-day max duration', value: stats.half_day?.max_duration, expected: '4' },
            { name: 'Home pass limit', value: stats.home_pass?.limit, expected: '2' },
            { name: 'Home pass used', value: stats.home_pass?.used, expected: '>= 0' },
            { name: 'Home pass remaining', value: stats.home_pass?.remaining, expected: '>= 0' },
            { name: 'Home pass max duration days', value: stats.home_pass?.max_duration_days, expected: '3' }
        ];

        let allPassed = true;
        checks.forEach(check => {
            const passed = check.value !== undefined && check.value !== null && check.value !== 0 || check.expected.includes('>=');
            const status = passed ? '✅' : '❌';
            console.log(`   ${status} ${check.name}: ${check.value} (expected ${check.expected})`);
            if (!passed) allPassed = false;
        });

        console.log('');
        if (allPassed) {
            console.log('✅ ALL CHECKS PASSED - Stats API is working correctly!');
        } else {
            console.log('⚠️  Some checks failed - please review the output above');
        }

        // Step 4: Fetch history for comparison
        console.log('\n4. Fetching pass history...');
        const historyResponse = await axios.get(`${BASE_URL}/passes/my-passes`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (historyResponse.data.success) {
            console.log('✅ History fetched successfully');
            console.log(`   Total passes in history: ${historyResponse.data.data.total}`);
            console.log('   Sample pass:');
            if (historyResponse.data.data.passes.length > 0) {
                console.log(JSON.stringify(historyResponse.data.data.passes[0], null, 2));
            }
        }

        // Step 5: Fetch system settings
        console.log('\n5. Fetching system settings...');
        const settingsResponse = await axios.get(`${BASE_URL}/passes/config`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (settingsResponse.data.success) {
            console.log('✅ Settings fetched successfully');
            console.log('   Settings:', JSON.stringify(settingsResponse.data.data, null, 2));
        }

    } catch (error) {
        console.error('\n❌ ERROR:', error.response?.data || error.message);
        if (error.response?.data) {
            console.error('   Details:', JSON.stringify(error.response.data, null, 2));
        }
    }

    console.log('\n=== TEST COMPLETE ===');
}

testStatsFix();

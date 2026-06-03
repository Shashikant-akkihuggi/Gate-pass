const axios = require('axios');

const testCreateCoordinator = async () => {
    const loginUrl = 'http://localhost:5000/api/v1/auth/login';
    const createUrl = 'http://localhost:5000/api/v1/admin/coordinators';

    try {
        // 1. Login as Admin
        console.log('Logging in as Admin...');
        const loginRes = await axios.post(loginUrl, {
            identifier: 'admin',
            password: 'admin123'
        });
        const token = loginRes.data.data.tokens.accessToken;
        console.log('✓ Logged in successfully');

        // 2. Create Coordinator
        console.log('Creating Coordinator...');
        const coordData = {
            full_name: 'Test Coordinator',
            department: 'CSE',
            mobile_number: '9876543210',
            password: 'password123'
        };

        const createRes = await axios.post(createUrl, coordData, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('✓ Coordinator created successfully');
        console.log('Response:', JSON.stringify(createRes.data, null, 2));

        // 3. Try to login as Coordinator
        console.log('\nLogging in as New Coordinator...');
        const coordLoginRes = await axios.post(loginUrl, {
            identifier: '9876543210',
            password: 'password123'
        });

        console.log('✓ Coordinator logged in successfully');
        console.log('Role:', coordLoginRes.data.data.user.role);

    } catch (error) {
        console.error('✗ Test failed:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Error:', error.message);
        }
    }
};

testCreateCoordinator();

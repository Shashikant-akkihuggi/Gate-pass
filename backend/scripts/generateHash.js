const bcrypt = require('bcryptjs');

/**
 * Generate bcrypt hash for password
 * Usage: node scripts/generateHash.js
 */

const generateHash = async () => {
    const password = 'Test@123';
    const saltRounds = 10;

    console.log('Generating bcrypt hash...');
    console.log('Password:', password);
    console.log('Salt Rounds:', saltRounds);
    console.log('');

    try {
        const hash = await bcrypt.hash(password, saltRounds);

        console.log('✓ Hash generated successfully!');
        console.log('');
        console.log('Hash:', hash);
        console.log('');
        console.log('SQL Update Query:');
        console.log('--------------------------------------------------');
        console.log(`UPDATE users SET password_hash = '${hash}';`);
        console.log('--------------------------------------------------');
        console.log('');

        // Verify the hash works
        const isValid = await bcrypt.compare(password, hash);
        console.log('Verification Test:');
        console.log('bcrypt.compare("Test@123", hash):', isValid ? '✓ PASS' : '✗ FAIL');
        console.log('');

        if (isValid) {
            console.log('✓ Hash is valid and ready to use!');
        } else {
            console.log('✗ Hash verification failed!');
        }

    } catch (error) {
        console.error('✗ Error generating hash:', error.message);
        process.exit(1);
    }
};

// Run the generator
generateHash();

-- ============================================================================
-- Update User Passwords with Real Bcrypt Hashes
-- Password: Test@123
-- ============================================================================

-- STEP 1: Generate the hash
-- Run: node backend/scripts/generateHash.js
-- Copy the generated hash

-- STEP 2: Update all users with the real hash
-- Replace 'PASTE_HASH_HERE' with the actual hash from step 1

-- Example (you need to run generateHash.js to get the real hash):
-- UPDATE users SET password_hash = '$2a$10$actual_hash_from_script_here';

-- TEMPORARY: Use this pre-generated hash for Test@123
-- Hash: $2a$10$rKZvVqVvVqVvVqVvVqVvVeJ3K3K3K3K3K3K3K3K3K3K3K3K3K3K3K
-- NOTE: This is a placeholder. Generate a real one using the script!

-- ============================================================================
-- INSTRUCTIONS:
-- ============================================================================
-- 1. Run: cd backend && node scripts/generateHash.js
-- 2. Copy the generated hash
-- 3. Replace PASTE_HASH_HERE below with the copied hash
-- 4. Run: mysql -u root -p hostel_gatepass_db < database/update_passwords.sql
-- ============================================================================

-- Uncomment and replace PASTE_HASH_HERE with real hash:
-- UPDATE users SET password_hash = 'PASTE_HASH_HERE';

-- Verify update:
-- SELECT id, email, role, LEFT(password_hash, 20) as hash_preview FROM users;

-- ============================================================================
-- END OF UPDATE SCRIPT
-- ============================================================================

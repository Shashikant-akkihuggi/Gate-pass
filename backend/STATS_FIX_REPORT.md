# Student Dashboard Statistics Fix Report

## Issue Summary
Student Dashboard statistics were showing all zeros (0) for:
- Total passes
- Approved passes
- Pending passes
- Rejected passes
- Half-day monthly limit and usage
- Home pass monthly limit and usage

While the Recent History correctly displayed pass records.

## Root Cause Analysis

### Primary Issue: Incorrect Database Schema Assumption
The code was attempting to look up student records using a non-existent `user_id` column:

```javascript
// INCORRECT CODE (before fix)
const userId = req.user.id;
const [studentRows] = await db.query('SELECT id FROM students WHERE user_id = ?', [userId]);
const studentId = studentRows[0].id;
```

**Problem:** The `students` table does NOT have a `user_id` column. The authentication system for students directly uses the `students.id` as the JWT token's user ID.

### Database Schema Reality
- Students authenticate using their USN (unique student number)
- On login, the JWT token contains `userId: student.id` where `student.id` is the PRIMARY KEY from the `students` table
- There is NO separate `users` table entry for students (unlike staff roles)
- The `students` table structure:
  ```sql
  CREATE TABLE students (
      id INT PRIMARY KEY,
      usn VARCHAR(30) UNIQUE,
      full_name VARCHAR(100),
      branch VARCHAR(50),
      year INT,
      section VARCHAR(10),
      coordinator_id INT,
      mobile VARCHAR(20),
      password_hash VARCHAR(255),
      ...
      -- NO user_id column!
  )
  ```

### How Authentication Works for Students
From `authController.js`:
```javascript
// Login finds student by USN
const [students] = await db.query('SELECT * FROM students WHERE usn = ?', [identifier.toUpperCase()]);

// Token payload uses student.id directly
const tokenPayload = {
    userId: student.id,  // This is students.id, NOT users.id
    id: student.id,
    role: 'STUDENT',
    usn: student.usn
};
```

### Secondary Issue: Missing NULL Handling
The SQL SUM() functions can return NULL when no rows match, which would cause parseInt() to return NaN.

## Files Modified

### 1. `backend/src/controllers/passController.js`
**Functions Fixed:**
- `getPassStats()` - Primary stats API (Lines ~379-469)
- `getMyPasses()` - Recent history API (Lines ~168-230)
- `getPassDetails()` - Single pass details (Lines ~233-310)
- `cancelPass()` - Cancel pass (Lines ~312-360)
- `downloadPassPDF()` - PDF generation (Lines ~530-630)
- `requestExtension()` - Extension request (Lines ~670-730)

**Changes:**
```javascript
// BEFORE (INCORRECT)
const userId = req.user.id;
const [studentRows] = await db.query('SELECT id FROM students WHERE user_id = ?', [userId]);
if (studentRows.length === 0) {
    return res.status(404).json({ success: false, message: 'Student profile not found' });
}
const studentId = studentRows[0].id;

// AFTER (CORRECT)
// For STUDENT role, req.user.id is already the student ID
const studentId = req.user.id;
```

**Additional Improvements in `getPassStats()`:**
1. Added `COALESCE()` to SQL queries to handle NULL values
2. Enhanced logging with JSON.stringify for better debugging
3. Added explicit parseInt() conversions with fallback values
4. Improved settings fallback logic
5. Added comprehensive console.log statements

### 2. `backend/src/middleware/passValidation.js`
**Functions Fixed:**
- `checkActivePasses()` - Validates no duplicate active passes
- `checkMonthlyLimit()` - Validates monthly limits

**Same pattern applied:**
```javascript
// BEFORE: Incorrect lookup
const userId = req.user.id;
const [studentRows] = await db.query('SELECT id FROM students WHERE user_id = ?', [userId]);
const studentId = studentRows[0].id;

// AFTER: Direct usage
const studentId = req.user.id;
```

## SQL Queries Fixed

### Stats Query (in getPassStats)
```sql
-- Added COALESCE to handle NULL values from SUM()
SELECT 
    COUNT(*) as total_passes,
    COALESCE(SUM(CASE WHEN current_status IN (...) THEN 1 ELSE 0 END), 0) as in_approval,
    COALESCE(SUM(CASE WHEN current_status IN (...) THEN 1 ELSE 0 END), 0) as approved,
    COALESCE(SUM(CASE WHEN current_status = 'REJECTED' THEN 1 ELSE 0 END), 0) as rejected,
    COALESCE(SUM(CASE WHEN current_status = 'CANCELLED' THEN 1 ELSE 0 END), 0) as cancelled
FROM passes
WHERE student_id = ?
```

### Settings Query
```sql
-- Correctly fetches from system_settings
SELECT max_half_day_per_month, max_home_pass_per_month, 
       max_half_day_hours, max_home_pass_days 
FROM system_settings 
LIMIT 1
```

## API Endpoints Fixed

### 1. GET `/api/v1/passes/stats`
**Purpose:** Returns dashboard statistics
**Returns:**
```json
{
  "success": true,
  "data": {
    "total_passes": 2,
    "in_approval": 0,
    "approved": 2,
    "rejected": 0,
    "cancelled": 0,
    "half_day": {
      "limit": 4,
      "used": 2,
      "remaining": 2,
      "max_duration": 4
    },
    "home_pass": {
      "limit": 2,
      "used": 0,
      "remaining": 2,
      "max_duration_days": 3
    },
    "halfDayMonthlyLimit": 4,
    "halfDayMaxHours": 4,
    "homePassMonthlyLimit": 2,
    "homePassMaxDays": 3
  }
}
```

### 2. GET `/api/v1/passes/my-passes`
**Purpose:** Returns all passes for the student
**Status:** Fixed - now correctly retrieves passes

### 3. GET `/api/v1/passes/:id`
**Purpose:** Get single pass details
**Status:** Fixed

### 4. PUT `/api/v1/passes/:id/cancel`
**Purpose:** Cancel a pass
**Status:** Fixed

### 5. GET `/api/v1/passes/:id/download`
**Purpose:** Download pass PDF
**Status:** Fixed

### 6. POST `/api/v1/passes/:id/extend`
**Purpose:** Request extension
**Status:** Fixed

## Verification

### Database Verification
Created `diagnose_stats_issue.js` to verify:
- ✅ system_settings table populated
- ✅ students table structure
- ✅ passes exist for students
- ✅ Stats queries return correct data
- ✅ Monthly counts calculated correctly

**Sample Output:**
```
Settings data: {
  "max_half_day_hours": 4,
  "max_home_pass_days": 3,
  "max_half_day_per_month": 4,
  "max_home_pass_per_month": 2,
  "enable_half_day": 1,
  "enable_home_pass": 1
}

Stats query result: {
  "total_passes": 2,
  "in_approval": "0",
  "approved": "2",
  "rejected": "0",
  "cancelled": "0"
}
```

### API Testing
Created `test_stats_fix.js` for end-to-end testing:
1. Student login
2. Fetch stats API
3. Verify all fields
4. Compare with history
5. Verify settings

## Logging Added
Enhanced debugging with console.log statements:
```javascript
console.log('DEBUG: getPassStats - studentId:', studentId);
console.log('DEBUG: getPassStats - Raw stats from DB:', JSON.stringify(stats[0]));
console.log('DEBUG: getPassStats - Settings rows from DB:', JSON.stringify(settingsRows));
console.log('DEBUG: getPassStats - Final settings:', JSON.stringify(settings));
console.log('DEBUG: getPassStats - Final response data:', JSON.stringify(responseData));
```

## Testing Instructions

### 1. Run Diagnostic Script
```bash
cd backend
node diagnose_stats_issue.js
```

### 2. Test API Endpoints
```bash
node test_stats_fix.js
```

### 3. Manual Testing
1. Start the backend server: `node server.js`
2. Login as a student with USN and password
3. Navigate to student dashboard
4. Verify statistics are showing correctly

## Status Categories Explained

### Pending/In Approval
- PENDING
- IN_APPROVAL
- PENDING_CLASS_COORDINATOR
- PENDING_HOSTEL_OFFICE
- PENDING_CHIEF_WARDEN
- EXTENSION_PENDING

### Approved
- FINAL_APPROVED
- APPROVED
- EXITED
- OUTSIDE
- RETURNED
- COMPLETED
- LATE_RETURN
- COMPLETED_LATE
- EXTENDED

### Rejected
- REJECTED

### Cancelled
- CANCELLED

## Calculations

### Monthly Usage
```javascript
// For current month only
const [monthlyTypeCounts] = await db.query(
    `SELECT pt.code, COUNT(*) as count
     FROM passes p
     JOIN pass_types pt ON p.pass_type_id = pt.id
     WHERE p.student_id = ?
     AND MONTH(p.created_at) = MONTH(CURRENT_DATE())
     AND YEAR(p.created_at) = YEAR(CURRENT_DATE())
     AND p.current_status NOT IN ('CANCELLED', 'REJECTED')
     GROUP BY pt.code`,
    [studentId]
);
```

### Remaining Calculation
```javascript
remaining = Math.max(0, limit - used)
```

## Summary

✅ **FIXED:** All student dashboard statistics now calculate correctly
✅ **FIXED:** All student pass-related endpoints working
✅ **FIXED:** Monthly limits and usage tracking functional
✅ **REMOVED:** All hardcoded fallback zeros
✅ **ADDED:** Comprehensive logging for debugging
✅ **ADDED:** NULL handling in SQL queries

### Exact API Failing
- ❌ `GET /api/v1/passes/stats` - Was failing due to incorrect student ID lookup
- ✅ Now returns correct statistics

### SQL Query Used
See "SQL Queries Fixed" section above

### Files Modified
1. `backend/src/controllers/passController.js` (6 functions)
2. `backend/src/middleware/passValidation.js` (2 functions)

### Root Cause
**Authentication architecture mismatch:** Code assumed students had entries in a separate `users` table with `user_id` foreign key, but students authenticate directly via the `students` table with their USN, and JWT tokens use `students.id` as the user ID.

## Future Recommendations
1. Consider adding database documentation for authentication flows
2. Add integration tests for student authentication and stats
3. Consider unified user architecture if adding more student features
4. Add data validation tests to catch schema mismatches

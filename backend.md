# Hostel Gate Pass Management System - Backend

Node.js + Express.js + MySQL backend API for the Hostel Gate Pass Management System.

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MySQL 8.0+
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: express-validator
- **Logging**: Winston
- **Security**: Helmet, CORS, Rate Limiting

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.js          # MySQL connection pool
│   │   ├── jwt.js               # JWT configuration
│   │   └── constants.js         # Application constants
│   ├── middleware/
│   │   ├── auth.js              # Authentication middleware
│   │   ├── roleCheck.js         # Role-based authorization
│   │   ├── errorHandler.js      # Global error handler
│   │   ├── notFound.js          # 404 handler
│   │   ├── validator.js         # Validation middleware
│   │   └── rateLimiter.js       # Rate limiting
│   ├── routes/
│   │   ├── auth.js              # Authentication routes
│   │   ├── pass.js              # Pass management routes
│   │   ├── approval.js          # Approval workflow routes
│   │   ├── scan.js              # QR scan routes
│   │   ├── dashboard.js         # Dashboard routes
│   │   └── admin.js             # Admin routes
│   ├── controllers/             # Route controllers (to be created)
│   ├── services/                # Business logic (to be created)
│   ├── models/                  # Database models (to be created)
│   ├── utils/
│   │   └── logger.js            # Winston logger
│   └── app.js                   # Express app setup
├── .env.example                 # Environment variables template
├── .gitignore
├── package.json
├── server.js                    # Server entry point
└── README.md
```

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ and npm
- MySQL 8.0+
- Git

### 2. Installation

```bash
# Clone the repository
git clone <repository-url>
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### 3. Database Setup

```bash
# Run database setup from project root
cd ../database
mysql -u root -p < setup.sql
```

### 4. Environment Configuration

Edit `.env` file with your settings:

```env
NODE_ENV=development
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=hostel_gatepass_db
JWT_ACCESS_SECRET=your_secret_key
JWT_REFRESH_SECRET=your_refresh_secret
```

**⚠️ IMPORTANT**: Change all secret keys in production!

### 5. Start Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

Server will start at `http://localhost:5000`

## API Documentation

### Base URL

```
http://localhost:5000/api/v1
```

### Health Check

```
GET /health
```

### Authentication Endpoints

| Method | Endpoint                | Description          | Access  |
| ------ | ----------------------- | -------------------- | ------- |
| POST   | `/auth/login`           | User login           | Public  |
| POST   | `/auth/logout`          | User logout          | Private |
| POST   | `/auth/refresh-token`   | Refresh access token | Public  |
| GET    | `/auth/profile`         | Get user profile     | Private |
| PUT    | `/auth/change-password` | Change password      | Private |

### Pass Management Endpoints

| Method | Endpoint                     | Description        | Access   |
| ------ | ---------------------------- | ------------------ | -------- |
| POST   | `/passes`                    | Apply for pass     | Student  |
| GET    | `/passes`                    | Get all passes     | Private  |
| GET    | `/passes/:id`                | Get pass by ID     | Private  |
| PUT    | `/passes/:id`                | Update pass        | Student  |
| DELETE | `/passes/:id`                | Cancel pass        | Student  |
| GET    | `/passes/student/:studentId` | Get student passes | Private  |
| GET    | `/passes/qr/:qrCode`         | Validate QR code   | Watchman |

### Approval Endpoints

| Method | Endpoint                     | Description           | Access    |
| ------ | ---------------------------- | --------------------- | --------- |
| GET    | `/approvals/pending`         | Get pending approvals | Approvers |
| POST   | `/approvals/:passId/approve` | Approve pass          | Approvers |
| POST   | `/approvals/:passId/reject`  | Reject pass           | Approvers |
| GET    | `/approvals/history`         | Get approval history  | Approvers |

### Scan Endpoints

| Method | Endpoint                 | Description       | Access   |
| ------ | ------------------------ | ----------------- | -------- |
| POST   | `/scan/exit`             | Record exit scan  | Watchman |
| POST   | `/scan/entry`            | Record entry scan | Watchman |
| GET    | `/scan/history`          | Get scan history  | Watchman |
| GET    | `/scan/validate/:qrCode` | Validate QR       | Watchman |

### Dashboard Endpoints

| Method | Endpoint               | Description        | Access    |
| ------ | ---------------------- | ------------------ | --------- |
| GET    | `/dashboard/student`   | Student dashboard  | Student   |
| GET    | `/dashboard/approver`  | Approver dashboard | Approvers |
| GET    | `/dashboard/watchman`  | Watchman dashboard | Watchman  |
| GET    | `/dashboard/admin`     | Admin dashboard    | Admin     |
| GET    | `/dashboard/analytics` | Detailed analytics | Admin     |

### Admin Endpoints

| Method | Endpoint           | Description      | Access |
| ------ | ------------------ | ---------------- | ------ |
| GET    | `/admin/users`     | Get all users    | Admin  |
| POST   | `/admin/users`     | Create user      | Admin  |
| PUT    | `/admin/users/:id` | Update user      | Admin  |
| DELETE | `/admin/users/:id` | Delete user      | Admin  |
| GET    | `/admin/classes`   | Get all classes  | Admin  |
| POST   | `/admin/classes`   | Create class     | Admin  |
| GET    | `/admin/settings`  | Get settings     | Admin  |
| PUT    | `/admin/settings`  | Update settings  | Admin  |
| GET    | `/admin/reports`   | Generate reports | Admin  |

## Authentication

### JWT Token Flow

1. User logs in with credentials
2. Server returns access token (15 min) and refresh token (7 days)
3. Client includes access token in Authorization header: `Bearer <token>`
4. When access token expires, use refresh token to get new access token

### Request Headers

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

## Response Format

### Success Response

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {},
  "timestamp": "2026-05-18T10:30:00Z"
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message",
    "details": []
  },
  "timestamp": "2026-05-18T10:30:00Z"
}
```

## User Roles

- **STUDENT**: Apply for passes, view own passes
- **CLASS_COORDINATOR**: Approve/reject passes for assigned classes
- **HOSTEL_OFFICE**: Second-level approval
- **CHIEF_WARDEN**: Final approval authority
- **WATCHMAN**: Scan QR codes, record entry/exit
- **ADMIN**: Full system access

## Security Features

- JWT-based authentication
- Role-based access control (RBAC)
- Password hashing with bcrypt
- Rate limiting on sensitive endpoints
- Helmet.js security headers
- CORS protection
- Input validation
- SQL injection prevention (parameterized queries)

## Error Codes

- `VALIDATION_ERROR`: Input validation failed
- `AUTHENTICATION_ERROR`: Authentication failed
- `AUTHORIZATION_ERROR`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `DUPLICATE_ENTRY`: Duplicate record
- `DATABASE_ERROR`: Database operation failed
- `INTERNAL_ERROR`: Internal server error

## Development

### Available Scripts

```bash
# Start development server with auto-reload
npm run dev

# Start production server
npm start

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

### Adding New Routes

1. Create route file in `src/routes/`
2. Import and mount in `src/app.js`
3. Add authentication and role checks as needed

### Adding New Middleware

1. Create middleware file in `src/middleware/`
2. Export middleware function
3. Apply to routes as needed

## Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- auth.test.js
```

## Logging

Logs are managed by Winston:

- **Development**: Console output with colors
- **Production**: File-based logging
  - `logs/error.log`: Error logs only
  - `logs/combined.log`: All logs

## Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Change all secret keys
- [ ] Configure production database
- [ ] Set up SSL/TLS
- [ ] Configure CORS for production domain
- [ ] Set up log rotation
- [ ] Configure backup strategy
- [ ] Set up monitoring and alerts
- [ ] Review rate limits
- [ ] Test all endpoints

### Environment Variables

Ensure all required environment variables are set in production:

```bash
NODE_ENV=production
PORT=5000
DB_HOST=production-db-host
DB_USER=production-user
DB_PASSWORD=strong-password
JWT_ACCESS_SECRET=strong-secret-key
JWT_REFRESH_SECRET=strong-refresh-key
CORS_ORIGIN=https://yourdomain.com
```

## Troubleshooting

### Database Connection Issues

```bash
# Check MySQL is running
mysql -u root -p

# Verify database exists
SHOW DATABASES;

# Check connection pool settings in .env
```

### Port Already in Use

```bash
# Find process using port 5000
lsof -i :5000

# Kill process
kill -9 <PID>
```

### JWT Token Issues

- Verify secret keys match in .env
- Check token expiry settings
- Ensure Authorization header format: `Bearer <token>`

## Support

For issues or questions:

1. Check this README
2. Review API documentation
3. Check logs in `logs/` directory
4. Verify environment configuration

## Next Steps

1. Implement controllers in `src/controllers/`
2. Create service layer in `src/services/`
3. Add database models in `src/models/`
4. Implement business logic
5. Add validation schemas
6. Write unit tests
7. Add API documentation (Swagger/OpenAPI)

---

**Version**: 1.0.0  
**Last Updated**: 2026-05-18  
**Node Version**: 18+

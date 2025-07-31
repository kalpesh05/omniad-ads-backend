# Express MySQL JWT Authentication Backend

A production-ready Node.js Express backend with MySQL database, JWT authentication, and role-based authorization.

## Features

- 🔐 **JWT Authentication** - Secure token-based authentication
- 👥 **Role-Based Authorization** - Admin, Moderator, and User roles
- 🗄️ **MySQL Database** - Robust relational database with connection pooling
- 🔒 **Security Features** - Rate limiting, CORS, security headers, input validation
- 📝 **Input Validation** - Comprehensive validation with detailed error messages
- 🔄 **Refresh Tokens** - Secure token refresh mechanism
- 🏗️ **Clean Architecture** - Well-structured codebase with separation of concerns
- 📊 **Error Handling** - Centralized error handling with detailed logging
- 🚀 **Production Ready** - Environment-based configuration and security

## Project Structure

```
├── config/
│   └── database.js          # Database configuration and connection
├── controllers/
│   ├── authController.js    # Authentication logic
│   └── userController.js    # User management logic
├── middleware/
│   ├── auth.js             # Authentication & authorization middleware
│   ├── validation.js       # Input validation middleware
│   ├── security.js         # Security middleware (rate limiting, etc.)
│   └── errorHandler.js     # Global error handling
├── models/
│   ├── User.js             # User model
│   └── RefreshToken.js     # Refresh token model
├── routes/
│   ├── index.js            # API info and health check routes
│   ├── auth.js             # Authentication routes
│   └── users.js            # User management routes
├── utils/
│   ├── jwt.js              # JWT utility functions
│   └── response.js         # Standardized API responses
├── app.js                  # Express application setup
├── server.js               # Server startup and configuration
├── .env                    # Environment variables
└── README.md               # Project documentation
```

## Quick Start

### Prerequisites

- Node.js (v14 or higher)
- MySQL (v5.7 or higher)
- npm or yarn

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your database credentials and JWT secret.

3. **Create MySQL database:**
   ```sql
   CREATE DATABASE express_auth_db;
   ```

4. **Start the server:**
   ```bash
   # Development
   npm run dev

   # Production
   npm start
   ```

The server will automatically create the necessary database tables on first run.

## API Endpoints

### Authentication

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| POST | `/api/auth/register` | Register new user | Public |
| POST | `/api/auth/login` | User login | Public |
| POST | `/api/auth/refresh-token` | Refresh access token | Public |
| POST | `/api/auth/logout` | User logout | Private |
| GET | `/api/auth/profile` | Get user profile | Private |
| PUT | `/api/auth/profile` | Update user profile | Private |
| PUT | `/api/auth/change-password` | Change password | Private |

### User Management

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/api/users` | Get all users | Admin/Moderator |
| GET | `/api/users/:id` | Get user by ID | Admin/Moderator |
| PUT | `/api/users/:id` | Update user | Admin/Moderator |
| DELETE | `/api/users/:id` | Delete user | Admin |
| GET | `/api/users/stats` | Get user statistics | Admin/Moderator |

### Utility

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/api/health` | Health check | Public |
| GET | `/api` | API information | Public |

## User Roles

- **Admin**: Full access to all endpoints
- **Moderator**: Can view and update users (except role changes)
- **User**: Can only access their own profile

## Request/Response Examples

### Registration
```bash
POST /api/auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!"
}
```

### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

### Protected Requests
```bash
GET /api/auth/profile
Authorization: Bearer <your-jwt-token>
```

## Security Features

- **JWT Tokens**: Secure authentication with configurable expiration
- **Refresh Tokens**: Long-lived tokens for seamless user experience
- **Rate Limiting**: Prevents brute force attacks
- **Password Hashing**: Bcrypt with configurable salt rounds
- **Input Validation**: Comprehensive validation with sanitization
- **CORS Protection**: Configurable cross-origin resource sharing
- **Security Headers**: Helmet.js for security headers
- **SQL Injection Prevention**: Parameterized queries

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment | development |
| `DB_HOST` | MySQL host | localhost |
| `DB_USER` | MySQL username | root |
| `DB_PASSWORD` | MySQL password | - |
| `DB_NAME` | Database name | express_auth_db |
| `DB_PORT` | MySQL port | 3306 |
| `JWT_SECRET` | JWT signing secret | - |
| `JWT_EXPIRE` | JWT expiration | 7d |
| `BCRYPT_SALT_ROUNDS` | Password hashing rounds | 12 |

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'user', 'moderator') DEFAULT 'user',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Refresh Tokens Table
```sql
CREATE TABLE refresh_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(500) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email address",
      "value": "invalid-email"
    }
  ]
}
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.
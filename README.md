# Express.js JWT RBAC Application

A complete Node.js Express application with JWT authentication, role-based access control (RBAC), input validation, and file upload functionality.

## Features

- **JWT Authentication** - Secure token-based authentication
- **Role-Based Access Control** - Admin, Moderator, and User roles
- **Input Validation** - Comprehensive validation using express-validator
- **File Upload** - Secure file upload with type and size restrictions
- **Security** - Helmet, CORS, rate limiting, and password hashing
- **Error Handling** - Comprehensive error handling and validation
- **RESTful API** - Clean REST API design with proper HTTP status codes

## Prerequisites

- Node.js 18.20 or higher
- npm or yarn package manager

## Installation

1. **Clone or create the project directory:**
```bash
mkdir express-jwt-app
cd express-jwt-app
```

2. **Copy the application files:**
   - Copy `app.js` to your project directory
   - Copy `package.json` to your project directory

3. **Install dependencies:**
```bash
npm install
```

4. **Create uploads directory:**
```bash
mkdir uploads
```

5. **Set environment variables (optional):**
```bash
# Create .env file
echo "JWT_SECRET=your-super-secret-jwt-key-change-in-production" > .env
echo "PORT=3000" >> .env
```

## Running the Application

### Development Mode (with auto-restart):
```bash
npm run dev
```

### Production Mode:
```bash
npm start
```

The server will start on `http://localhost:3000` (or the port specified in environment variables).

## API Endpoints

### Authentication

#### Register User
```http
POST /api/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Password123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "user"  // optional: "admin", "moderator", "user" (default: "user")
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user",
      "createdAt": "2025-07-27T...",
      "updatedAt": "2025-07-27T...",
      "profilePicture": null
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Password123"
}
```

### User Profile

#### Get User Profile
```http
GET /api/user/profile
Authorization: Bearer <your-jwt-token>
```

#### Update User Profile
```http
PUT /api/user/profile
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "firstName": "Jane",
  "lastName": "Smith"
}
```

### File Upload

#### Upload File
```http
POST /api/upload
Authorization: Bearer <your-jwt-token>
Content-Type: multipart/form-data

file: <file-data>
```

**Supported file types:** JPEG, PNG, GIF, PDF, DOC, DOCX  
**Maximum file size:** 5MB

#### Upload Profile Picture
```http
POST /api/user/profile-picture
Authorization: Bearer <your-jwt-token>
Content-Type: multipart/form-data

profilePicture: <image-file>
```

### Admin Routes

#### Get All Users (Admin Only)
```http
GET /api/admin/users
Authorization: Bearer <admin-jwt-token>
```

#### Delete User (Admin/Moderator Only)
```http
DELETE /api/admin/users/:id
Authorization: Bearer <admin-or-moderator-jwt-token>
```

## User Roles

- **Admin**: Full access to all endpoints including user management
- **Moderator**: Can delete users but cannot access all admin functions
- **User**: Basic access to own profile and file upload

## Validation Rules

### Registration:
- **Email**: Must be a valid email format
- **Password**: Minimum 6 characters, must contain at least one lowercase letter, one uppercase letter, and one number
- **First Name**: 2-50 characters
- **Last Name**: 2-50 characters
- **Role**: Must be one of: "admin", "moderator", "user"

### Login:
- **Email**: Must be a valid email format
- **Password**: Required

### Profile Update:
- **First Name**: 2-50 characters (optional)
- **Last Name**: 2-50 characters (optional)

## Security Features

- **Password Hashing**: bcryptjs with salt rounds of 12
- **JWT Tokens**: 24-hour expiration
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing
- **File Upload Security**: Type and size validation
- **Input Validation**: Comprehensive validation and sanitization

## Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [] // Array of validation errors (if applicable)
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate email)
- `500` - Internal Server Error

## Testing the API

### Using cURL:

1. **Register a user:**
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123",
    "firstName": "Test",
    "lastName": "User"
  }'
```

2. **Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123"
  }'
```

3. **Get profile (replace YOUR_JWT_TOKEN):**
```bash
curl -X GET http://localhost:3000/api/user/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

4. **Upload file:**
```bash
curl -X POST http://localhost:3000/api/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/your/file.jpg"
```

### Using Postman:

1. Create a new collection
2. Set up environment variables for base URL and token
3. Add requests for each endpoint
4. Use the token from login response in subsequent requests

## Environment Variables

Create a `.env` file in the root directory:

```env
# Required in production
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Optional
PORT=3000
NODE_ENV=production
```

## Production Considerations

1. **Database**: Replace in-memory storage with a proper database (MongoDB, PostgreSQL, MySQL)
2. **JWT Secret**: Use a strong, randomly generated secret key
3. **File Storage**: Consider cloud storage (AWS S3, Google Cloud Storage) for file uploads
4. **Logging**: Implement proper logging (Winston, Morgan)
5. **Environment Variables**: Use proper environment configuration
6. **HTTPS**: Enable HTTPS in production
7. **Database Encryption**: Encrypt sensitive data at rest
8. **Input Sanitization**: Additional input sanitization for XSS prevention
9. **API Documentation**: Consider Swagger/OpenAPI documentation
10. **Monitoring**: Add application monitoring and health checks

## Development Setup

For development with auto-restart:

```bash
npm install -g nodemon
npm run dev
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.
# User Management System - Implementation Guide

## Overview
This implementation adds a complete user management system with JWT authentication, MongoDB integration, and account management features.

## New Features

### 1. User Authentication
- **Sign Up**: Create new accounts with username, email, and password
- **Login**: Secure login with email/username and password
- **JWT Token**: Secure session management using JWT tokens
- **Password Hashing**: Passwords are securely hashed using bcrypt

### 2. User Account Management
- **Account Page**: View and edit user information
- **Credits System**: Track remaining image generation credits
- **Update Profile**: Modify username and email
- **Image History**: View all previously generated images

### 3. Database Structure

#### Users Collection
```javascript
{
  _id: ObjectId,
  username: String,
  email: String,
  password: String (hashed),
  credits: Number,
  createdAt: Date,
  updatedAt: Date
}
```

#### Pictures Collection (Updated)
```javascript
{
  _id: ObjectId,
  email: String,
  userId: String (optional),
  username: String (optional),
  image: String,
  plan: String (optional),
  createdAt: Date
}
```

## API Routes

### Authentication Routes

#### POST /api/auth/signup
Create a new user account
```javascript
Request:
{
  "username": "string",
  "email": "string",
  "password": "string"
}

Response:
{
  "success": true,
  "token": "jwt_token",
  "user": {
    "id": "user_id",
    "username": "string",
    "email": "string",
    "credits": 0
  }
}
```

#### POST /api/auth/login
Login to existing account
```javascript
Request:
{
  "emailOrUsername": "string",
  "password": "string"
}

Response:
{
  "success": true,
  "token": "jwt_token",
  "user": {
    "id": "user_id",
    "username": "string",
    "email": "string",
    "credits": number
  }
}
```

### Account Management Routes

#### GET /api/user/account
Get user account information and image history
```javascript
Headers:
Authorization: Bearer <jwt_token>

Response:
{
  "success": true,
  "user": {
    "id": "user_id",
    "username": "string",
    "email": "string",
    "credits": number,
    "createdAt": "date"
  },
  "images": [
    {
      "image": "url",
      "createdAt": "date",
      "plan": "string"
    }
  ]
}
```

#### PUT /api/user/account
Update user account information
```javascript
Headers:
Authorization: Bearer <jwt_token>

Request:
{
  "username": "string",
  "email": "string"
}

Response:
{
  "success": true,
  "user": {
    "username": "string",
    "email": "string"
  }
}
```

### Updated Save Download Route

#### POST /api/save-download
Save image download with user tracking
```javascript
Headers:
Content-Type: application/json
Authorization: Bearer <jwt_token> (optional)

Request:
{
  "email": "string",
  "imageUrl": "string",
  "plan": "string"
}
```

## Environment Variables

Add these to your `.env` file:

```env
# MongoDB Connection
MONGODB_URI=your_mongodb_connection_string

# JWT Secret (change to a random secure string)
SECRET=your_secret_jwt_key_change_this

# Google AI API Key
GOOGLE_API_KEY=your_GOOGLE_API_KEY
```

## Frontend Features

### Header Navigation
- **Not Logged In**: Shows "Sign Up / Login" button
- **Logged In**: Shows "Account" button and "Logout" button

### Pages
1. **Login Page** (`/login`): Email/username and password login
2. **Signup Page** (`/signup`): Create new account
3. **Account Page** (`/account`): 
   - View user information
   - Display remaining credits
   - Edit username and email
   - View all generated images with timestamps

### Authentication Flow
1. User signs up or logs in
2. JWT token is stored in localStorage
3. Token is automatically sent with authenticated requests
4. Token is checked on page load to maintain session
5. User can logout to clear token

## Security Features

- Passwords are hashed with bcrypt (salt rounds: 10)
- JWT tokens expire after 7 days
- Tokens are validated on protected routes
- Username and email uniqueness is enforced
- Password minimum length: 6 characters

## Usage

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```

### Database Setup
1. Create a MongoDB database
2. Add connection string to `.env` file
3. Collections will be created automatically on first use

## Credits System
- New users start with 0 credits
- Credits must be purchased through pricing plans
- Credits are displayed in the account page
- Future feature: Deduct credits when generating images

## Image Tracking
- All generated images are linked to user accounts
- Images include timestamp and plan information
- Users can view their complete image history in the account page

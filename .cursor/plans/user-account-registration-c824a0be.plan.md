<!-- c824a0be-8201-49d2-bf9b-82fe31b6e19a e9861b2d-a53f-47ec-9f39-a2cfcb6fc013 -->
# User Account Registration Implementation

## Overview

Create a complete user authentication system with registration and login endpoints, using JWT tokens, bcrypt password hashing, and MongoDB for user storage.

## Implementation Steps

### 1. Install Required Dependencies

Install packages:

- `@nestjs/jwt` - JWT token generation and validation
- `@nestjs/passport` - Authentication middleware
- `passport` and `passport-jwt` - JWT strategy
- `bcrypt` - Password hashing
- `class-validator` and `class-transformer` - DTO validation

### 2. Create Users Module Structure

Generate a new `users` module with:

- **User Schema** (`src/users/schemas/user.schema.ts`):
- `nationCode` (String, required)
- `phoneNumber` (String, required)
- `password` (String, required, hashed)
- `fullname` (String, required, min 6 chars)
- Unique compound index on `nationCode + phoneNumber`
- Timestamps (createdAt, updatedAt)

- **DTOs** (`src/users/dto/`):
- `create-user.dto.ts`: Validation with class-validator (phone fields required, password/fullname min 6 chars)
- `login-user.dto.ts`: nationCode, phoneNumber, password
- `user-response.dto.ts`: Response without password field

### 3. Create Auth Module with JWT

- **Auth Service** (`src/auth/auth.service.ts`):
- `register()`: Hash password with bcrypt, check for duplicate phone numbers, create user, return user + JWT token
- `login()`: Validate credentials, compare hashed password, return user + JWT token
- `validateUser()`: Find user by phone and verify password

- **JWT Strategy** (`src/auth/strategies/jwt.strategy.ts`):
- Extract token from Authorization header
- Validate and decode JWT payload
- Attach user to request object

- **Auth Controller** (`src/auth/auth.controller.ts`):
- `POST /auth/register`: Accept nationCode, phoneNumber, password, fullname
- `POST /auth/login`: Accept nationCode, phoneNumber, password
- Both return `{ user: UserResponseDto, accessToken: string }`

### 4. Configure JWT Module

- Set up `JwtModule` in `AuthModule` with secret key from environment variables
- Configure token expiration (e.g., 7 days)
- Create JWT guard for protected routes

### 5. Update App Module

- Import `UsersModule` and `AuthModule` into `AppModule`
- Ensure modules are properly registered

### 6. API Documentation

- Add Swagger decorators to all endpoints
- Document request/response schemas
- Include example values for phone numbers

## Files to Create

- `src/users/schemas/user.schema.ts`
- `src/users/dto/create-user.dto.ts`
- `src/users/dto/user-response.dto.ts`
- `src/users/users.service.ts`
- `src/users/users.module.ts`
- `src/auth/dto/login-user.dto.ts`
- `src/auth/dto/auth-response.dto.ts`
- `src/auth/auth.service.ts`
- `src/auth/auth.controller.ts`
- `src/auth/auth.module.ts`
- `src/auth/strategies/jwt.strategy.ts`
- `src/auth/guards/jwt-auth.guard.ts`

## Validation Rules

- `nationCode`: Required, string (e.g., "+84")
- `phoneNumber`: Required, string, numeric (e.g., "961096963")
- `password`: Required, min 6 characters
- `fullname`: Required, min 6 characters
- Phone number combination must be unique

### To-dos

- [ ] Install required npm packages: @nestjs/jwt, @nestjs/passport, passport, passport-jwt, bcrypt, class-validator, class-transformer
- [ ] Create User schema with Mongoose including nationCode, phoneNumber, password, fullname fields and unique index
- [ ] Create DTOs for user creation and response with class-validator decorators
- [ ] Create UsersModule, UsersService with methods to create and find users by phone number
- [ ] Create DTOs for login and auth response
- [ ] Create JWT strategy and auth guard for passport
- [ ] Create AuthService with register and login methods, including bcrypt password hashing
- [ ] Create AuthController with /auth/register and /auth/login endpoints with Swagger documentation
- [ ] Create AuthModule and configure JwtModule with environment variables
- [ ] Import UsersModule and AuthModule into AppModule
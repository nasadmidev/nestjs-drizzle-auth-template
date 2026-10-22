<p align="center">
  <a href="http://nestjs.com/" target="_blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

# NestJS Drizzle Template

A production-ready NestJS template with Drizzle ORM, PostgreSQL, JWT authentication, role-based access control, and Swagger documentation.
<p align="center">
  <img src="https://img.shields.io/github/stars/nasadmidev/nestjs-drizzle-auth-template?style=for-the-badge"></img>
  <a href="https://opensource.org/license/mit" target="_blank"><img src="https://img.shields.io/github/license/nasadmidev/nestjs-drizzle-auth-template?style=for-the-badge"></img></a>
  <a href="https://orm.drizzle.team/" target="_blank"><img src="https://img.shields.io/badge/Drizzle-%23000000.svg?style=for-the-badge&logo=drizzle&logoColor=C5F74F"></img></a>
  <a href="https://www.jwt.io/" target="_blank"><img src="https://img.shields.io/badge/json%20web%20tokens-%23000000.svg?style=for-the-badge&logo=jsonwebtokens&logoColor=white"></img></a>
  <a href="https://www.postgresql.org/" target="_blank"><img src="https://img.shields.io/badge/postgres-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white"></img></a>
  <a href="https://swagger.io/" target="_blank"><img src="https://img.shields.io/badge/Swagger-%2385EA2D.svg?style=for-the-badge&logo=swagger&logoColor=black"></img></a>
</p>

## Features

- **NestJS 12** with TypeScript `6.0.3`
- **Drizzle ORM** with PostgreSQL
- **JWT Authentication** with Passport (access & refresh tokens)
- **Refresh Token Rotation** with database storage and hashing
- **Automatic Token Cleanup** with scheduled tasks
- **Role-Based Access Control** (USER, ADMIN roles)
- **Rate Limiting** with `@nestjs/throttler`
- **HTTP-only & Secure Cookies** for token storage
- **Swagger/OpenAPI** documentation
- **Docker Compose** for local development
- **Testing** with Jest and mocking
- **Validation** with class-validator and Zod
- **Security** with Helmet, CORS, CSP

> [!IMPORTANT]
> Since `ts-jest` and `eslint-ts` do not support TypeScript 7.0, version 6.0.3 (the latest version supported by `eslint-ts`) is used.

## Prerequisites

- Node.js 20+
- pnpm (or npm/yarn)
- Docker & Docker Compose

## Installation

```bash
# Install dependencies
pnpm install
```

## Database Setup

```bash
# Start PostgreSQL container
pnpm run db:up

# Push schema to database
pnpm run db:push
```

## Environment Variables

Create a `.env` file in the root directory (see `.env.example` for reference):

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/nestjs?schema=public"

# JWT Access Token
JWT_SECRET="your-super-secret-key-change-in-production"
JWT_EXPIRES="1h"

# JWT Refresh Token
REFRESH_TOKEN_SECRET="your-refresh-token-secret-key-change-in-production"
REFRESH_TOKEN_EXPIRES="7d"

# App
PORT=3000
NODE_ENV=development

# CORS
WHITELIST="http://localhost:3000,http://localhost:5173"
```

## Running the Application

```bash
# Development (watch mode)
pnpm run start:dev

# Production
pnpm run start:prod
```

## API Documentation

Once running, access the Swagger UI at:

```
http://localhost:3000/docs
```

### Available Endpoints

#### Auth (`/auth`)

| Method | Endpoint                 | Description                                               | Public | Rate Limit |
| ------ | ------------------------ | --------------------------------------------------------- | ------ | ---------- |
| POST   | `/auth/login/set-cookie` | Login with credentials (sets tokens in httpOnly cookies)  | Yes    | 10 req/min |
| POST   | `/auth/login`            | Login with credentials (returns tokens in response)       | Yes    | 10 req/min |
| PUT    | `/auth/regenerate`       | Refresh access token using refresh token (body or cookie) | Yes    | 10 req/min |
| POST   | `/auth/register`         | Register a new user (returns tokens in cookies or JSON)   | Yes    | 10 req/min |
| DELETE | `/auth/logout`           | Logout (clears cookies)                                    | No     | N/A        |

#### User (`/user`)

| Method | Endpoint    | Description                    | Auth      |
| ------ | ----------- | ------------------------------ | --------- |
| GET    | `/user`     | Get current user               | JWT       |
| GET    | `/user/all` | Get all users (admin)          | JWT+ADMIN |
| GET    | `/user/:id` | Get user by ID (admin)         | JWT+ADMIN |
| POST   | `/user`     | Create user (admin only)       | JWT+ADMIN |
| PUT    | `/user`     | Update current user            | JWT       |
| PUT    | `/user/:id` | Update user (admin)            | JWT+ADMIN |
| DELETE | `/user`     | Delete current user            | JWT       |
| DELETE | `/user/:id` | Delete user (admin)            | JWT+ADMIN |

#### Health (`/health`)

| Method | Endpoint  | Description        | Auth |
| ------ | --------- | ------------------ | ---- |
| GET    | `/health` | Basic health check | No   |

## Testing

```bash
# Unit tests
pnpm run test

# Watch mode
pnpm run test:watch

# Coverage report
pnpm run test:cov

# E2E tests
pnpm run test:e2e
```

## Database Scripts

```bash
pnpm run db:up        # Start PostgreSQL
pnpm run db:down      # Stop PostgreSQL
pnpm run db:push      # Push schema to DB
pnpm run db:generate  # Generate migrations
pnpm run db:migrate   # Run migrations
pnpm run db:studio    # Open Drizzle Studio
pnpm run db:reset     # Drop and reset database
```

## Project Structure

```
src/
├── auth/               # Authentication module
│   ├── jwt/           # JWT strategy and guards
│   ├── roles/         # Role-based access control
│   ├── strategies/    # Passport strategies
│   ├── token-cleanup/ # Scheduled token cleanup service
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   └── auth.module.ts
├── user/              # User module
│   ├── user.controller.ts
│   ├── user.service.ts
│   ├── user.dto.ts
│   └── user.module.ts
├── db/                # Database schema and configuration
│   ├── schema.ts      # Database table definitions
│   ├── relations.ts   # Drizzle ORM relations
│   └── drizzle-exception/ # Exception filter for Drizzle errors
├── health/            # Health check module
│   ├── health.controller.ts
│   └── health.module.ts
├── common/           # Shared utilities
│   ├── pipes/        # Custom pipes
│   └── interceptors/ # Custom interceptors
├── main.ts           # Application bootstrap
└── app.module.ts     # Root module
```

## Customization

### Adding a New Module

Follow the existing pattern:

1. Create the module directory in `src/`
2. Create `*.module.ts`, `*.service.ts`, `*.controller.ts`, `*.dto.ts`
3. Register the module in `app.module.ts`
4. Add Swagger decorators to controller

### Adding a New Database Model

1. Add table definition to `src/db/schema.ts`
2. Add relations in `src/db/relations.ts` if needed
3. Run `pnpm run db:generate` to create a migration
4. Run `pnpm run db:migrate` to apply the migration

### Database Schema

The template includes the following tables:

#### `users`

- `id` (UUID, primary key)
- `email` (text, unique, not null)
- `role` (enum: USER/ADMIN, not null) - defined by exported `roleEnum`
- `password` (text, not null, bcrypt hashed)
- `created_at` (timestamp, not null)

#### `refresh_tokens`

- `id` (UUID, primary key)
- `user_id` (UUID, foreign key to users.id, CASCADE delete)
- `token_hash` (text, SHA-256 hash of refresh token, not null)
- `expires_at` (timestamp, not null)
- `created_at` (timestamp, not null)

**Note**: The `roleEnum` is exported from `src/db/schema.ts` and can be used in queries and validations throughout the application.

## Security Features

### User Registration

The template implements a secure user registration system:

- **Public Registration**: The `/auth/register` endpoint allows public user registration with a fixed `USER` role
- **Token Delivery**: Registration can return tokens via cookies (for web apps) or JSON (for other clients) using the `?type=cookies` or `?type=json` query parameter
- **Admin User Creation**: Only users with `ADMIN` role can create users with custom roles via the `/user` endpoint
- **Role Isolation**: This design prevents privilege escalation by ensuring only administrators can create users with elevated roles

### Refresh Token Rotation

The template implements a secure refresh token system:

- **Database Storage**: Refresh tokens are stored in the `refresh_tokens` table with SHA-256 hashes
- **Token Rotation**: Each refresh token is single-use - when used to generate a new access token, it's deleted and a new refresh token is issued
- **Automatic Cleanup**: When a user is deleted, all their refresh tokens are automatically deleted (CASCADE foreign key)
- **Expiration**: Refresh tokens expire after 7 days (configurable via `REFRESH_TOKEN_EXPIRES`)
- **Flexible Usage**: Tokens can be sent via request body or httpOnly cookies

### Automatic Token Cleanup

The `TokenCleanupService` runs as a scheduled task to maintain database hygiene:

- **Schedule**: Runs every day at 1 AM seconds using `@nestjs/schedule`
- **Function**: Deletes expired refresh tokens from the database
- **Logging**: Logs the number and IDs of deleted tokens for monitoring
- **Efficiency**: Uses database-level filtering for optimal performance

### Rate Limiting

The application uses `@nestjs/throttler` to prevent brute force attacks:

- **Default limit**: 60 requests per minute globally
- **Auth endpoints**: 10 requests per minute for login and token refresh
- **Health endpoint**: Excluded from rate limiting

### Cookie Security

Tokens stored in cookies use these security settings:

- **httpOnly**: Prevents XSS attacks by preventing JavaScript access
- **secure**: Only sent over HTTPS in production
- **sameSite**: 'lax' to prevent CSRF attacks while allowing normal navigation
- **Path restriction**: Refresh token cookie is only sent to `/auth/regenerate` endpoint

### Content Security Policy

Helmet CSP is configured with:

- **defaultSrc**: `'self'` - Only allow resources from same origin
- **styleSrc**: `'self'` - No inline styles allowed
- **scriptSrc**: `'self'` - No inline scripts allowed
- **imgSrc**: `'self'`, `data:`, `validator.swagger.io` - Allow data URIs and Swagger validator

### Password Hashing

- **bcrypt** with cost factor of 12 for secure password hashing
- Higher cost factor (12 vs default 10) for better security against brute force

## Exception Handling

This template includes a `DrizzleExceptionFilter` that handles PostgreSQL database errors from Drizzle ORM. The filter:

- **Uses `@Catch(DrizzleException)`** to only intercept custom `DrizzleException` instances, not all exceptions
- **Wraps all database operations** via `DrizzleService` which converts raw Drizzle errors into `DrizzleException` instances
- **Maps known PostgreSQL error codes** to appropriate HTTP status codes (e.g., 23505 → 409 Conflict, 23503 → 400 Bad Request)
- **Logs unknown PostgreSQL codes** as warnings before throwing `InternalServerErrorException` for debugging
- **Does not interfere with other error types** - `HttpException` and other exceptions are handled by NestJS's default error handling

### Adding Custom Exception Filters

To add your own exception filters without conflicts:

1. Create your filter class implementing `ExceptionFilter`
2. Register it in `main.ts` with `app.useGlobalFilters(new YourFilter())`
3. Order matters: filters are executed in the order they are registered
4. The `DrizzleExceptionFilter` only catches `DrizzleException`, so it won't interfere with your custom filters

Example:

```typescript
@Catch(CustomException)
export class CustomExceptionFilter implements ExceptionFilter {
  catch(exception: CustomException, host: ArgumentsHost) {
    // Your custom handling
  }
}
```

## License

[MIT](https://opensource.org/license/mit)

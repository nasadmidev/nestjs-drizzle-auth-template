# Project Information for Agents

## Exception Handling Strategy

The project uses a `DrizzleExceptionFilter` to handle PostgreSQL errors from Drizzle ORM.

### Key Design Decisions

1. **Selective Error Handling**: The filter uses `@Catch()` to catch all exceptions but only handles errors with a PostgreSQL error code (`exception.code`).

2. **HttpException Rethrow**: The filter explicitly checks for `HttpException` and rethrows it to let NestJS handle it with its default behavior.

3. **Non-Drizzle Error Rethrow**: Errors without a PostgreSQL code or with unknown codes are rethrown, allowing other custom filters to handle them.

4. **No Extension of BaseExceptionFilter**: The filter implements `ExceptionFilter` directly instead of extending `BaseExceptionFilter` to avoid type issues and simplify testing.

5. **No Conflict with Other Filters**: By rethrowing non-Drizzle errors, custom exception filters added by developers will work without interference.

### PostgreSQL Error Codes Handled

- `23505`: Unique constraint violation → 409 Conflict
- `23502`: Null constraint violation → 409 Conflict
- `23503`: Foreign key constraint violation → 400 Bad Request
- `23514`: Check constraint violation → 400 Bad Request
- `22P02`: Invalid input syntax (e.g., malformed UUID) → 400 Bad Request
- `22003`: Number out of range → 400 Bad Request
- `22001`: Value too long → 400 Bad Request
- `42P01`: Table does not exist → 500 Internal Server Error
- `42703`: Column does not exist → 500 Internal Server Error
- `42601`: SQL syntax error → 500 Internal Server Error

Unknown PostgreSQL codes are delegated to `BaseExceptionFilter`.

## Security Features

### Refresh Token System

The project implements a secure refresh token rotation system:

- **Storage**: Refresh tokens are stored in the `refresh_tokens` table with SHA-256 hashes
- **Rotation**: Each refresh token is single-use - when used, it's deleted and a new one is issued
- **Foreign Key**: `refresh_tokens.user_id` references `users.id` with CASCADE delete
- **Expiration**: Configurable via `REFRESH_TOKEN_EXPIRES` (default: 7 days)
- **Usage**: Tokens can be sent via request body or httpOnly cookies

### Automatic Token Cleanup

The `TokenCleanupService` uses `@nestjs/schedule` to clean expired tokens:

- **Schedule**: Runs every 30 seconds using `@Cron(CronExpression.EVERY_30_SECONDS)`
- **Cleanup**: Deletes refresh tokens where `expiresAt < now()`
- **Logging**: Logs deleted token IDs for monitoring
- **Location**: `src/auth/token-cleanup/token-cleanup.service.ts`

### Rate Limiting

- Global rate limiting using `@nestjs/throttler`
- Default: 60 requests per minute
- Auth endpoints: 10 requests per minute
- Health endpoint: Excluded from rate limiting

### Cookie Security

- **httpOnly**: Prevents XSS attacks
- **secure**: Only sent over HTTPS in production
- **sameSite**: 'lax' to prevent CSRF
- **Path restriction**: Refresh token cookie only sent to `/auth/regenerate`

### Password Hashing

- bcrypt with cost factor 12 (higher than default 10 for better security)

## Build and Test Commands

```bash
# Development
pnpm run start:dev

# Testing
pnpm run test              # Unit tests
pnpm run test:watch        # Watch mode
pnpm run test:cov          # Coverage report
pnpm run test:e2e          # E2E tests

# Database
pnpm run db:up             # Start PostgreSQL
pnpm run db:down           # Stop PostgreSQL
pnpm run db:push           # Push schema to DB
pnpm run db:generate       # Generate migrations
pnpm run db:migrate        # Run migrations
pnpm run db:studio         # Open Drizzle Studio
pnpm run db:reset          # Drop and reset database
```

## Technology Stack

- NestJS 12 with TypeScript
- Drizzle ORM 1.0.0-rc.4 with PostgreSQL
- JWT Authentication with Passport (access & refresh tokens)
- @nestjs/throttler for rate limiting
- Helmet for security headers and CSP
- Swagger/OpenAPI documentation
- Docker Compose for local development
- Jest for testing
- class-validator and Zod for validation

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

- NestJS 11 with TypeScript
- Drizzle ORM with PostgreSQL
- JWT Authentication with Passport
- Swagger/OpenAPI documentation
- Docker Compose for local development
- Jest for testing
- class-validator and Zod for validation

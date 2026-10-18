<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

# NestJS Drizzle Template

A production-ready NestJS template with Drizzle ORM, PostgreSQL, JWT authentication, role-based access control, and Swagger documentation.

## Features

- **NestJS 11** with TypeScript
- **Drizzle ORM** with PostgreSQL
- **JWT Authentication** with Passport (cookie & header support)
- **Role-Based Access Control** (USER, ADMIN roles)
- **Swagger/OpenAPI** documentation
- **Docker Compose** for local development
- **Testing** with Jest and mocking
- **Validation** with class-validator and Zod
- **Security** with Helmet, CORS

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

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/nestjs?schema=public"

# JWT
JWT_SECRET="your-super-secret-key-change-in-production"
JWT_EXPIRES="1h"

# App
PORT=3000
WHITELIST=""
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
| Method | Endpoint | Description | Public |
|--------|----------|-------------|--------|
| POST | `/auth/login/set-cookie` | Login with credentials (sets JWT in cookie) | Yes |
| POST | `/auth/login` | Login with credentials (returns JWT in response) | Yes |
| PUT | `/auth/regenerate` | Refresh JWT token | Yes |

#### User (`/user`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/user` | Get current user | JWT |
| GET | `/user/all` | Get all users (admin) | JWT+ADMIN |
| GET | `/user/:id` | Get user by ID (admin) | JWT+ADMIN |
| POST | `/user` | Create user | JWT |
| PUT | `/user` | Update current user | JWT |
| PUT | `/user/:id` | Update user (admin) | JWT+ADMIN |
| DELETE | `/user` | Delete current user | JWT |
| DELETE | `/user/:id` | Delete user (admin) | JWT+ADMIN |

#### Health (`/health`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/health` | Basic health check | No |

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
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   └── auth.module.ts
├── user/              # User module
│   ├── user.controller.ts
│   ├── user.service.ts
│   ├── user.dto.ts
│   └── user.module.ts
├── db/                # Database schema and configuration
│   ├── schema.ts
│   └── drizzle-exception/ # Exception filter for Drizzle errors
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
2. Run `pnpm run db:push`

## Exception Handling

This template includes a `DrizzleExceptionFilter` that handles PostgreSQL database errors from Drizzle ORM. The filter:

- **Catches all exceptions** but only handles Drizzle/PostgreSQL errors (errors with a PostgreSQL error code)
- **Rethrows `HttpException`** to let NestJS handle it with its default behavior
- **Rethrows non-Drizzle errors** to allow other custom filters to handle them
- **Maps common PostgreSQL error codes** to appropriate HTTP status codes (e.g., 23505 → 409 Conflict)

### Adding Custom Exception Filters

To add your own exception filters without conflicts:

1. Create your filter class implementing `ExceptionFilter`
2. Register it in `main.ts` with `app.useGlobalFilters(new YourFilter())`
3. Order matters: filters are executed in the order they are registered
4. The `DrizzleExceptionFilter` rethrows non-Drizzle errors, so it won't interfere with your custom filters

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

MIT

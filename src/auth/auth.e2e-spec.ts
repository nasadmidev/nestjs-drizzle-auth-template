import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import TestAgent from 'supertest/lib/agent';
import { AuthModule } from './auth.module';
import { DrizzleModule } from '@/db/drizzle.module';
import { DrizzleModule as NestDrizzle } from '@nestjs/drizzle';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { JwtGuard } from '@/auth/jwt/jwt.guard';
import { RolesGuard } from '@/auth/roles/role.guard';
import { jwtSettings, loadDrizzle, validationPipeOptions } from '@/settings';
import { DrizzleService } from '@/db/drizzle.service';
import request from 'supertest';
import { Server } from 'node:http';
import { Role, User, users } from '@/db/schema';
import { ilike } from 'drizzle-orm';
import { ConfigModule } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { ResponseInterceptor } from '@/common/interceptors/response.interceptor';
import { DrizzleExceptionFilter } from '@/db/drizzle-exception/drizzle-exception.filter';
import { responseInterceptorGenericObject } from '@/common/e2e/utils.test';
import { hash } from 'bcrypt';

describe('AuthController (E2E)', () => {
  let app: INestApplication;
  let req: TestAgent;
  let drizzleService: DrizzleService;
  let user: User;
  let userToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        AuthModule,
        NestDrizzle.forRootAsync(loadDrizzle()),
        JwtModule.register(jwtSettings),
        DrizzleModule,
      ],
      providers: [
        {
          provide: 'APP_GUARD',
          useClass: JwtGuard,
        },
        {
          provide: 'APP_GUARD',
          useClass: RolesGuard,
        },
      ],
    }).compile();

    drizzleService = moduleRef.get<DrizzleService>(DrizzleService);
    const jwtService = moduleRef.get<JwtService>(JwtService);
    app = moduleRef.createNestApplication();

    await drizzleService.execute(async (db) => {
      await db.delete(users).where(ilike(users.email, `%-@test-e2e.com%`));
    });

    user = (
      await drizzleService.execute(async (db) =>
        db
          .insert(users)
          .values({
            email: 'user-@test-e2e.com',
            password: await hash('User1234', 12),
            role: Role['USER'],
          })
          .returning(),
      )
    )[0];

    userToken = await jwtService.signAsync({
      sub: user.id,
      role: user.role,
    });

    app.useGlobalFilters(new DrizzleExceptionFilter());
    app.useGlobalPipes(new ValidationPipe(validationPipeOptions));
    app.useGlobalInterceptors(new ResponseInterceptor());
    app.use(cookieParser());
    await app.init();
  });

  beforeEach(() => {
    req = request(app.getHttpServer() as Server);
  });

  describe('POST /login', () => {
    it('(201): should login successfully and return tokens in JSON', async () => {
      const res = await req
        .post('/auth/login')
        .send({ identity: user.email, password: 'User1234' })
        .expect(201);

      expect(res.body).toEqual(
        expect.objectContaining(
          responseInterceptorGenericObject(res, '/auth/login', {
            accessToken: expect.any(String) as string,
            refreshToken: expect.any(String) as string,
          }),
        ),
      );
    });

    it('(403): should return 403 for invalid credentials', async () => {
      await req
        .post('/auth/login')
        .send({ identity: user.email, password: 'WrongPassword' })
        .expect(403);
    });

    it('(403): should return 403 for non-existent user', async () => {
      await req
        .post('/auth/login')
        .send({ identity: 'nonexistent@test.com', password: 'Password123' })
        .expect(403);
    });
  });

  describe('POST /login/set-cookie', () => {
    it('(201): should login successfully and set cookies', async () => {
      const res = await req
        .post('/auth/login/set-cookie')
        .send({ identity: user.email, password: 'User1234' })
        .expect(201);

      expect(res.body).toEqual(
        expect.objectContaining(
          responseInterceptorGenericObject(res, '/auth/login/set-cookie', {
            message: 'Logged in successfully',
          }),
        ),
      );

      expect(res.headers['set-cookie']).toBeDefined();
      const cookies = res.headers['set-cookie'] as unknown as string[];
      expect(cookies.some((cookie) => cookie.includes('access_token='))).toBe(
        true,
      );
      expect(cookies.some((cookie) => cookie.includes('refresh_token='))).toBe(
        true,
      );
    });

    it('(403): should return 403 for invalid credentials', async () => {
      await req
        .post('/auth/login/set-cookie')
        .send({ identity: user.email, password: 'WrongPassword' })
        .expect(403);
    });
  });

  describe('PUT /regenerate', () => {
    it('(403): should return 403 for invalid refresh token', async () => {
      await req
        .put('/auth/regenerate')
        .send({ refreshToken: 'invalid-token' })
        .expect(403);
    });

    it('(400): should return 400 when no refresh token is provided', async () => {
      await req.put('/auth/regenerate').expect(400);
    });
  });

  describe('DELETE /logout', () => {
    it('(200): should clear cookies when authenticated', async () => {
      const res = await req
        .delete('/auth/logout')
        .set('Cookie', [`access_token=${userToken}`])
        .expect(200);

      expect(res.body).toEqual(
        expect.objectContaining(
          responseInterceptorGenericObject(res, '/auth/logout', {
            message: 'Logout successfully',
          }),
        ),
      );

      expect(res.headers['set-cookie']).toBeDefined();
      const cookies = res.headers['set-cookie'] as unknown as string[];
      expect(cookies.some((cookie) => cookie.includes('access_token=;'))).toBe(
        true,
      );
      expect(cookies.some((cookie) => cookie.includes('refresh_token=;'))).toBe(
        true,
      );
    });
  });

  describe('POST /register', () => {
    it('(201): should register user and return tokens in JSON', async () => {
      const res = await req
        .post('/auth/register?type=json')
        .send({
          email: 'newuser@test-e2e.com',
          password: 'NewUser1234',
        })
        .expect(201);

      expect(res.body).toEqual(
        expect.objectContaining(
          responseInterceptorGenericObject(res, '/auth/register', {
            accessToken: expect.any(String) as string,
            refreshToken: expect.any(String) as string,
          }),
        ),
      );
    });

    it('(201): should register user and set cookies', async () => {
      const res = await req
        .post('/auth/register?type=cookies')
        .send({
          email: 'cookieuser@test-e2e.com',
          password: 'CookieUser1234',
        })
        .expect(201);

      expect(res.body).toEqual(
        expect.objectContaining(
          responseInterceptorGenericObject(res, '/auth/register', {
            message: 'Registration successfully',
          }),
        ),
      );

      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('(400): should return 400 when type is not specified', async () => {
      await req
        .post('/auth/register')
        .send({
          email: 'test@test.com',
          password: 'Test1234',
        })
        .expect(400);
    });

    it('(400): should return 400 for invalid email format', async () => {
      await req
        .post('/auth/register?type=json')
        .send({
          email: 'invalid-email',
          password: 'Test1234',
        })
        .expect(400);
    });

    it('(400): should return 400 for weak password', async () => {
      await req
        .post('/auth/register?type=json')
        .send({
          email: 'test@test.com',
          password: 'weak',
        })
        .expect(400);
    });

    it('(409): should return 409 for duplicate email', async () => {
      await req
        .post('/auth/register?type=json')
        .send({
          email: user.email,
          password: 'Test1234',
        })
        .expect(409);
    });
  });

  afterAll(async () => {
    await drizzleService.execute(async (db) => {
      await db.delete(users).where(ilike(users.email, `%@test-e2e.com%`));
    });
    await app.close();
  });
});

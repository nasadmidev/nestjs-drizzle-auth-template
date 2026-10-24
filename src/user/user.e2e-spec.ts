import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import TestAgent from 'supertest/lib/agent';
import { UserModule } from './user.module';
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

describe('UserController (E2E)', () => {
  let app: INestApplication;
  let req: TestAgent;
  let drizzleService: DrizzleService;
  let user: User;
  let admin: User;
  let userToken: string;
  let adminToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        UserModule,
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
            email: `user-@test-e2e.com`,
            password: 'User1234',
            role: Role['USER'],
          })
          .returning(),
      )
    )[0];

    admin = (
      await drizzleService.execute(async (db) =>
        db
          .insert(users)
          .values({
            email: `admin-@test-e2e.com`,
            password: 'Admin1234',
            role: Role['ADMIN'],
          })
          .returning(),
      )
    )[0];

    userToken = await jwtService.signAsync({
      sub: user.id,
      role: user.role,
    });

    adminToken = await jwtService.signAsync({
      sub: admin.id,
      role: admin.role,
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

  describe('GET /', () => {
    beforeAll(() => {
      if (!user || !userToken) {
        throw new Error('User or token not defined');
      }
    });

    it('(200): should return data of the authenticated user', async () => {
      const res = await req
        .get('/user')
        .set('Cookie', [`access_token=${userToken}`])
        .expect(200);
      expect(res.body).toEqual(
        expect.objectContaining(
          responseInterceptorGenericObject(res, '/user', {
            ...user,
            password: undefined,
            id: expect.any(String) as string,
            createdAt: expect.any(String) as string,
          }),
        ),
      );
    });

    it('(401): should return 401 when no token is provided', async () => {
      await req.get('/user').expect(401);
    });
  });

  describe('GET /all', () => {
    beforeAll(() => {
      if (!admin || !adminToken) {
        throw new Error('Admin or token not defined');
      }
    });

    it('(200): should return all users when authenticated as admin', async () => {
      const res = await req
        .get('/user/all')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body).toEqual(
        expect.objectContaining(
          responseInterceptorGenericObject(res, '/user/all', expect.any(Array)),
        ),
      );
      expect((res.body as { data: object }).data).toHaveLength(2);
    });

    it('(401): should return 401 when no token is provided', async () => {
      await req.get('/user/all').expect(401);
    });

    it('(403): should return 403 when authenticated as non-admin user', async () => {
      await req
        .get('/user/all')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('GET /:id', () => {
    let userToGet: User;

    beforeAll(async () => {
      if (!admin || !adminToken) {
        throw new Error('Admin or token not defined');
      }

      userToGet = (
        await drizzleService.execute(async (db) =>
          db
            .insert(users)
            .values({
              email: 'get-by-id@test-e2e.com',
              password: 'GetById1234',
              role: Role['USER'],
            })
            .returning(),
        )
      )[0];
    });

    it('(200): should return user by ID when authenticated as admin', async () => {
      const res = await req
        .get(`/user/${userToGet.id}`)
        .set('Cookie', [`access_token=${adminToken}`])
        .expect(200);
      expect(res.body).toEqual(
        expect.objectContaining(
          responseInterceptorGenericObject(res, `/user/${userToGet.id}`, {
            email: userToGet.email,
            role: userToGet.role,
            id: expect.any(String) as string,
            createdAt: expect.any(String) as string,
          }),
        ),
      );
    });

    it('(401): should return 401 when no token is provided', async () => {
      await req.get(`/user/${userToGet.id}`).expect(401);
    });

    it('(403): should return 403 when authenticated as non-admin user', async () => {
      await req
        .get(`/user/${userToGet.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('(400): should return 400 for invalid UUID', async () => {
      await req
        .get('/user/invalid-uuid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('(404): should return 404 when user does not exist', async () => {
      await req
        .get(`/user/00000000-0000-0000-0000-000000000000`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('POST /', () => {
    beforeAll(() => {
      if (!admin || !adminToken) {
        throw new Error('Admin or token not defined');
      }
    });

    it('(201): should create a new user when authenticated as admin', async () => {
      const newUser = {
        email: 'newuser@test-e2e.com',
        password: 'NewUser1234',
        role: Role['USER'],
      };

      const res = await req
        .post('/user')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newUser)
        .expect(201);

      expect(res.body).toEqual(
        expect.objectContaining(
          responseInterceptorGenericObject(res, '/user', {
            email: newUser.email,
            role: newUser.role,
            id: expect.any(String) as string,
            createdAt: expect.any(String) as string,
          }),
        ),
      );
    });

    it('(401): should return 401 when no token is provided', async () => {
      await req
        .post('/user')
        .send({
          email: 'test@test.com',
          password: 'Test1234',
          role: Role['USER'],
        })
        .expect(401);
    });

    it('(403): should return 403 when authenticated as non-admin user', async () => {
      await req
        .post('/user')
        .set('Cookie', [`access_token=${userToken}`])
        .send({
          email: 'test@test.com',
          password: 'Test1234',
          role: Role['USER'],
        })
        .expect(403);
    });

    it('(400): should return 400 for invalid email format', async () => {
      await req
        .post('/user')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'invalid-email',
          password: 'Test1234',
          role: Role['USER'],
        })
        .expect(400);
    });

    it('(400): should return 400 for weak password', async () => {
      await req
        .post('/user')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'test@test.com', password: 'weak', role: Role['USER'] })
        .expect(400);
    });

    it('(409): should return 409 for duplicate email', async () => {
      await req
        .post('/user')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: user.email, password: 'Test1234', role: Role['USER'] })
        .expect(409);
    });
  });

  describe('PUT /', () => {
    let userToUpdate: User;
    let userToUpdateToken: string;

    beforeAll(async () => {
      const jwtService = app.get<JwtService>(JwtService);

      userToUpdate = (
        await drizzleService.execute(async (db) =>
          db
            .insert(users)
            .values({
              email: 'update-me@test-e2e.com',
              password: 'UpdateMe1234',
              role: Role['USER'],
            })
            .returning(),
        )
      )[0];

      userToUpdateToken = await jwtService.signAsync({
        sub: userToUpdate.id,
        role: userToUpdate.role,
      });
    });

    it('(200): should update current authenticated user', async () => {
      const updateData = {
        email: 'updated-user@test-e2e.com',
        password: 'UpdatedUser1234',
      };

      const res = await req
        .put('/user')
        .set('Cookie', [`access_token=${userToUpdateToken}`])
        .send(updateData)
        .expect(200);

      expect(res.body).toEqual(
        expect.objectContaining(
          responseInterceptorGenericObject(res, '/user', {
            email: updateData.email,
            id: expect.any(String) as string,
            createdAt: expect.any(String) as string,
          }),
        ),
      );
    });

    it('(401): should return 401 when no token is provided', async () => {
      await req.put('/user').send({ email: 'test@test.com' }).expect(401);
    });

    it('(400): should return 400 for invalid email format', async () => {
      await req
        .put('/user')
        .set('Authorization', `Bearer ${userToUpdateToken}`)
        .send({ email: 'invalid-email' })
        .expect(400);
    });

    it('(400): should return 400 for weak password', async () => {
      await req
        .put('/user')
        .set('Authorization', `Bearer ${userToUpdateToken}`)
        .send({ password: 'weak' })
        .expect(400);
    });
  });

  describe('PUT /:id', () => {
    let userToUpdateById: User;

    beforeAll(async () => {
      if (!admin || !adminToken) {
        throw new Error('Admin or token not defined');
      }

      userToUpdateById = (
        await drizzleService.execute(async (db) =>
          db
            .insert(users)
            .values({
              email: 'update-by-id@test-e2e.com',
              password: 'UpdateById1234',
              role: Role['USER'],
            })
            .returning(),
        )
      )[0];
    });

    it('(200): should update user by ID when authenticated as admin', async () => {
      const updateData = {
        email: 'admin-updated@test-e2e.com',
        role: Role['USER'],
      };

      const res = await req
        .put(`/user/${userToUpdateById.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(res.body).toEqual(
        expect.objectContaining(
          responseInterceptorGenericObject(
            res,
            `/user/${userToUpdateById.id}`,
            {
              email: updateData.email,
              role: updateData.role,
              id: expect.any(String) as string,
              createdAt: expect.any(String) as string,
            },
          ),
        ),
      );
    });

    it('(401): should return 401 when no token is provided', async () => {
      await req
        .put(`/user/${userToUpdateById.id}`)
        .send({ email: 'test@test.com' })
        .expect(401);
    });

    it('(403): should return 403 when authenticated as non-admin user', async () => {
      await req
        .put(`/user/${userToUpdateById.id}`)
        .set('Cookie', [`access_token=${userToken}`])
        .send({ email: 'test@test.com' })
        .expect(403);
    });

    it('(400): should return 400 for invalid UUID', async () => {
      await req
        .put('/user/invalid-uuid')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'test@test.com' })
        .expect(400);
    });

    it('(400): should return 400 for invalid email format', async () => {
      await req
        .put(`/user/${userToUpdateById.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'invalid-email' })
        .expect(400);
    });

    it('(404): should return 404 when user does not exist', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      await req
        .put(`/user/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'test@test.com' })
        .expect(404);
    });
  });

  describe('DELETE /', () => {
    let userToDelete: User;
    let userToDeleteToken: string;

    beforeAll(async () => {
      const jwtService = app.get<JwtService>(JwtService);

      userToDelete = (
        await drizzleService.execute(async (db) =>
          db
            .insert(users)
            .values({
              email: 'delete-me@test-e2e.com',
              password: 'DeleteMe1234',
              role: Role['USER'],
            })
            .returning(),
        )
      )[0];

      userToDeleteToken = await jwtService.signAsync({
        sub: userToDelete.id,
        role: userToDelete.role,
      });
    });

    it('(200): should delete current authenticated user', async () => {
      const res = await req
        .delete('/user')
        .set('Cookie', [`access_token=${userToDeleteToken}`])
        .expect(200);

      expect(res.body).toEqual(
        expect.objectContaining(
          responseInterceptorGenericObject(res, '/user', {
            id: expect.any(String) as string,
            email: expect.any(String) as string,
          }),
        ),
      );
    });

    it('(401): should return 401 when no token is provided', async () => {
      await req.delete('/user').expect(401);
    });
  });

  describe('DELETE /:id', () => {
    let userToDelete: User;

    beforeAll(async () => {
      if (!admin || !adminToken) {
        throw new Error('Admin or token not defined');
      }

      userToDelete = (
        await drizzleService.execute(async (db) =>
          db
            .insert(users)
            .values({
              email: 'to-delete@test-e2e.com',
              password: 'Delete1234',
              role: Role['USER'],
            })
            .returning(),
        )
      )[0];
    });

    it('(200): should delete user by ID when authenticated as admin', async () => {
      const res = await req
        .delete(`/user/${userToDelete.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toEqual(
        expect.objectContaining(
          responseInterceptorGenericObject(res, `/user/${userToDelete.id}`, {
            id: expect.any(String) as string,
            email: expect.any(String) as string,
          }),
        ),
      );
    });

    it('(401): should return 401 when no token is provided', async () => {
      await req.delete(`/user/${userToDelete.id}`).expect(401);
    });

    it('(403): should return 403 when authenticated as non-admin user', async () => {
      await req
        .delete(`/user/${userToDelete.id}`)
        .set('Cookie', [`access_token=${userToken}`])
        .expect(403);
    });

    it('(400): should return 400 for invalid UUID', async () => {
      await req
        .delete('/user/invalid-uuid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('(404): should return 404 when user does not exist', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      await req
        .delete(`/user/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  afterAll(async () => {
    await drizzleService.execute(async (db) => {
      await db.delete(users).where(ilike(users.email, `%@test-e2e.com%`));
    });
    await app.close();
  });
});

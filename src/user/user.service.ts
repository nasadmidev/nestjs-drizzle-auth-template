import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { validateUUID } from '@/common/pipes/uuid-validator/uuid-validator.pipe';
import { CreateUserDTO, UpdateUserDTO } from './user.dto';
import { hash } from 'bcrypt';
import { DrizzleService } from '@/db/drizzle.service';
import { users } from '@/db/schema';

@Injectable()
export class UserService {
  constructor(private readonly drizzleService: DrizzleService) {}

  async findAll() {
    return await this.drizzleService.execute(async (db) => {
      return await db.select().from(users);
    });
  }

  async findOne(id: string) {
    validateUUID(id);
    return await this.drizzleService.execute(async (db) => {
      return await db.select().from(users).where(eq(users.id, id));
    });
  }

  async findOneByEmail(email: string) {
    return await this.drizzleService.execute(async (db) => {
      return await db.select().from(users).where(eq(users.email, email));
    });
  }

  async create(data: CreateUserDTO) {
    const parsedData = { ...data, password: await hash(data.password, 12) };
    return await this.drizzleService.execute(async (db) => {
      return await db.insert(users).values(parsedData).returning();
    });
  }

  async delete(id: string) {
    validateUUID(id);
    return await this.drizzleService.execute(async (db) => {
      return await db.delete(users).where(eq(users.id, id)).returning();
    });
  }

  async update(id: string, data: UpdateUserDTO) {
    validateUUID(id);
    return await this.drizzleService.execute(async (db) => {
      return await db
        .update(users)
        .set(data)
        .where(eq(users.id, id))
        .returning();
    });
  }
}

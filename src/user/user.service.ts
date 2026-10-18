import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { eq } from 'drizzle-orm';
import { type DrizzleDatabase, users } from '@/db/schema';
import { validateUUID } from '@/common/pipes/uuid-validator/uuid-validator.pipe';
import { CreateUserDTO, UpdateUserDTO } from './user.dto';
import { hash } from 'bcrypt';

@Injectable()
export class UserService {
  constructor(@InjectDrizzle() private readonly drizzle: DrizzleDatabase) {}

  async findAll() {
    return await this.drizzle.select().from(users);
  }

  async findOne(id: string) {
    validateUUID(id);
    return await this.drizzle.select().from(users).where(eq(users.id, id));
  }

  async findOneByEmail(email: string) {
    return await this.drizzle
      .select()
      .from(users)
      .where(eq(users.email, email));
  }

  async create(data: CreateUserDTO) {
    const parsedData = { ...data, password: await hash(data.password, 12) };
    return await this.drizzle.insert(users).values(parsedData).returning();
  }

  async delete(id: string) {
    validateUUID(id);
    return await this.drizzle.delete(users).where(eq(users.id, id)).returning();
  }

  async update(id: string, data: UpdateUserDTO) {
    validateUUID(id);
    return await this.drizzle
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
  }
}

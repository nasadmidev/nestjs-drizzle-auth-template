import { SetMetadata } from '@nestjs/common';
import { Role } from '@/db/schema';

export const Roles = (...role: Role[]) => SetMetadata('role', role);

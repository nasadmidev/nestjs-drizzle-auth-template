import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  IsStrongPassword,
  MaxLength,
} from 'class-validator';
import { PartialType, ApiProperty } from '@nestjs/swagger';
import { Role } from '@/db/schema';

export class CreateUserDTO {
  @ApiProperty({
    description: 'User email address',
    example: 'johndoe@example.com',
  })
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(500)
  email!: string;

  @ApiProperty({
    description: 'User password (min 8 chars, uppercase, lowercase, number)',
    example: 'SecurePass123',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @IsStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 0,
  })
  password!: string;

  @ApiProperty({
    description: 'User role',
    enum: Role,
    example: Role.USER,
  })
  @IsString()
  @IsNotEmpty()
  @IsEnum(Role)
  role!: Role;
}

export class UpdateUserDTO extends PartialType(CreateUserDTO) {}

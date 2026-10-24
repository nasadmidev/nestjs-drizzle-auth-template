import {
  Body,
  Controller,
  Get,
  Param,
  Req,
  Put,
  Delete,
  Post,
  NotFoundException,
} from '@nestjs/common';
import { UserService } from './user.service';
import type { RequestAuthorized } from '@/auth/auth.service';
import { CreateUserDTO, UpdateUserDTO } from './user.dto';
import { Roles } from '@/auth/roles/role.decorator';
import { Role } from '@/db/schema';
import { UuidValidatorPipe } from '@/common/pipes/uuid-validator/uuid-validator.pipe';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  PickType,
} from '@nestjs/swagger';

class UpdateAuthenticatedUserDTO extends PickType(UpdateUserDTO, [
  'email',
  'password',
]) {}

@ApiTags('user')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('all')
  @Roles(Role['ADMIN'])
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all users (admin only)' })
  @ApiResponse({ status: 200, description: 'List of all users' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin only' })
  async getAllUsers() {
    return await this.userService.findAll();
  }

  @Get()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiResponse({ status: 200, description: 'Current user data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUser(@Req() req: RequestAuthorized) {
    const { user } = req;
    const dbUser = (await this.userService.findOne(user.sub))[0];
    if (!dbUser) throw new NotFoundException('User not found');
    const { id, email, createdAt, role } = dbUser;
    return { id, email, createdAt, role };
  }

  @Get(':id')
  @Roles(Role['ADMIN'])
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get user by ID (admin only)' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin only' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(@Param('id', new UuidValidatorPipe()) userId: string) {
    const dbUser = (await this.userService.findOne(userId))[0];
    if (!dbUser) throw new NotFoundException('User not found');
    const { id, email, createdAt, role } = dbUser;
    return { id, email, createdAt, role };
  }

  @Post()
  @Roles(Role['ADMIN'])
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new user (admin only)' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createUser(@Body() data: CreateUserDTO) {
    const { id, email, role, createdAt } = (
      await this.userService.create(data)
    )[0];
    return { id, email, role, createdAt };
  }

  @Put()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update current authenticated user' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateUser(
    @Req() req: RequestAuthorized,
    @Body() data: UpdateAuthenticatedUserDTO,
  ) {
    const { user } = req;
    const dbUser = (await this.userService.update(user.sub, data))[0];
    if (!dbUser) throw new NotFoundException('User not found');
    const { email, id, createdAt } = dbUser;
    return { email, id, createdAt };
  }

  @Put(':id')
  @Roles(Role['ADMIN'])
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update user by ID (admin only)' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin only' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUserById(
    @Param('id', new UuidValidatorPipe()) userId: string,
    @Body() data: UpdateUserDTO,
  ) {
    const dbUser = (await this.userService.update(userId, data))[0];
    if (!dbUser) throw new NotFoundException('User not found');
    const { email, id, createdAt, role } = dbUser;
    return { email, id, createdAt, role };
  }

  @Delete()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete current authenticated user' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteUser(@Req() req: RequestAuthorized) {
    const { user } = req;
    const dbUser = (await this.userService.delete(user.sub))[0];
    if (!dbUser) throw new NotFoundException('User not found');
    const { id, email } = dbUser;
    return { id, email };
  }

  @Delete(':id')
  @Roles(Role['ADMIN'])
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete user by ID (admin only)' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin only' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deleteUserById(@Param('id', new UuidValidatorPipe()) userId: string) {
    const dbUser = (await this.userService.delete(userId))[0];
    if (!dbUser) throw new NotFoundException('User not found');
    const { id, email } = dbUser;
    return { id, email };
  }
}

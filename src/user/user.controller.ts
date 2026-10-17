import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Put,
  Delete,
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
} from '@nestjs/swagger';

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
    return await this.userService.findOne(user.sub);
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
  async getUserById(@Param('id', new UuidValidatorPipe()) id: string) {
    return await this.userService.findOne(id);
  }

  @Post()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createUser(@Body() data: CreateUserDTO) {
    return await this.userService.create(data);
  }

  @Put()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update current authenticated user' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateUser(@Req() req: RequestAuthorized, @Body() data: UpdateUserDTO) {
    const { user } = req;
    return await this.userService.update(user.sub, data);
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
    @Param('id', new UuidValidatorPipe()) id: string,
    @Body() data: UpdateUserDTO,
  ) {
    return await this.userService.update(id, data);
  }

  @Delete()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete current authenticated user' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteUser(@Req() req: RequestAuthorized) {
    const { user } = req;
    return await this.userService.delete(user.sub);
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
  async deleteUserById(@Param('id', new UuidValidatorPipe()) id: string) {
    return await this.userService.delete(id);
  }
}

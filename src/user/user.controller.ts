import {
  Body,
  Controller,
  HttpStatus,
  Post,
  HttpException,
  Logger,
  Patch,
  Get,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBody,
  ApiResponse,
  ApiOperation,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { RegisterDto, UpdateUserDto } from '../dtos/user.dto';
import { PublicUser, User } from '../drizzle/schema';
import { Request } from 'express';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  private readonly logger = new Logger(UserController.name);

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiBody({ type: RegisterDto })
  async createUser(@Body() dto: RegisterDto): Promise<{ message: string }> {
    await this.userService.createUser(dto);
    return { message: 'please check your mail!!!' };
  }

  @Patch()
  @ApiOperation({ summary: 'Update a user' })
  @ApiResponse({ status: 200, description: 'User updated successfully.' })
  @ApiResponse({ status: 400, description: 'User ID is required' })
  @ApiResponse({ status: 500, description: 'Unexpected server error' })
  @ApiBody({ type: UpdateUserDto })
  @ApiCookieAuth('connect.sid')
  async updateUser(
    @Body() dto: UpdateUserDto,
    @Req() req: Request,
  ): Promise<PublicUser | null> {
    if (!req.session.userId) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    return this.userService.updateUser({ ...dto, id: req.session.userId });
  }

  @Get('/verify-user')
  @ApiOperation({ summary: 'Verify user email using token' })
  @ApiResponse({ status: 200, description: 'User verified successfully' })
  @ApiResponse({ status: 400, description: 'Token expired or user not found' })
  async verifyUser(@Query('token') token: string): Promise<PublicUser | null> {
    return this.userService.verifyUser(token);
  }
}

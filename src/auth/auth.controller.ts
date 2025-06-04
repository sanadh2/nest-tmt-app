import {
  Body,
  Controller,
  HttpStatus,
  Post,
  Logger,
  Req,
  Res,
  Get,
  HttpException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Request, Response } from 'express';
import {
  ApiTags,
  ApiBody,
  ApiResponse,
  ApiCookieAuth,
  ApiOperation,
} from '@nestjs/swagger';
import { LoginDto } from '../dtos/user.dto';

@ApiTags('Auth')
@ApiCookieAuth('connect.sid')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  private readonly logger = new Logger(AuthController.name);

  @Post()
  @ApiOperation({ summary: 'User Login' })
  @ApiResponse({ status: 200, description: 'User logged in successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiBody({ type: LoginDto })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const user = await this.authService.verifyLoginCredentials(dto);
    req.session.userId = user.id;
    res.status(HttpStatus.OK);
    return res.json({ message: 'logged in' });
  }

  @Get('/me')
  @ApiOperation({ summary: 'User Details' })
  @ApiResponse({ status: 200, description: '' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async me(@Req() req: Request, @Res() res: Response) {
    if (!req.session.userId) {
      throw new HttpException('Unauthorised', HttpStatus.UNAUTHORIZED);
    }

    const user = await this.authService.getUser(req.session.userId);
    res.status(HttpStatus.OK);
    return res.json({ user });
  }
}

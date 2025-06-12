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
  UseGuards,
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
import { AuthGuard } from '@nestjs/passport';
import { AuthenticatedGuard } from './auth.guard';
import { PublicUser } from 'src/drizzle/schema';

@ApiTags('Auth')
@ApiCookieAuth('connect.sid')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  private readonly logger = new Logger(AuthController.name);

  @Get('/csrf-token')
  @ApiOperation({ summary: 'Get CSRF token' })
  @ApiResponse({ status: 200, description: 'Returns CSRF token' })
  getCsrfToken(@Req() req: Request, @Res() res: Response) {
    const token = req.csrfToken?.();
    res.json({ csrfToken: token });
  }



  @Post()
  @ApiOperation({ summary: 'User Login' })
  @ApiResponse({ status: 200, description: 'User logged in successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiBody({ type: LoginDto })
  @UseGuards(AuthGuard('local'))
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
      console.log('🟢 Login route reached with:', dto);
    if (!req.user) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }
    const reqUser = req.user;

    await new Promise<void>((resolve, reject) => {
      req.logIn(reqUser, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
    req.session.userId = (req.user as PublicUser | undefined)?.id;
    res.status(HttpStatus.OK);
    return res.json(req.user);
  }

  @Get('/google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {}

  @Get('/google/redirect')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req: Request) {
    return {
      message: 'User info from Google',
      user: req.user,
    };
  }

  @Get('/profile')
  @UseGuards(AuthenticatedGuard)
  getProfile(@Req() req: Request) {
    if (!req.user) {
      throw new HttpException('Unauthorised', HttpStatus.UNAUTHORIZED);
    }
    const userId = req.user.id;
    return this.authService.getUser(userId);
  }
}

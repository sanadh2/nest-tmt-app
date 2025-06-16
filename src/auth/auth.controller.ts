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

  @Post('login')
  @ApiOperation({ summary: 'User Login' })
  @ApiResponse({ status: 200, description: 'User logged in successfully.' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 403, description: 'Email not verified' })
  @ApiBody({ type: LoginDto })
  @UseGuards(AuthGuard('local'))
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    this.logger.debug('Login attempt with dto:', dto);

    if (!req.user) {
      this.logger.warn('Login failed: No user in request after authentication');
      throw new HttpException('Authentication failed', HttpStatus.UNAUTHORIZED);
    }

    try {
      const user = req.user as PublicUser;
      await new Promise<void>((resolve, reject) => {
        req.logIn(user, (err) => {
          if (err) {
            this.logger.error('Login error:', err);
            return reject(err);
          }
          resolve();
        });
      });

      req.session.userId = user.id;
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            this.logger.error('Session save error:', err);
            return reject(err);
          }
          resolve();
        });
      });

      this.logger.log('User logged in successfully:', dto.identifier);
      return res.status(HttpStatus.OK).json(user);
    } catch (error) {
      this.logger.error('Login process error:', error);
      throw new HttpException('Login failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('/google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {}

  @Get('/google/redirect')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req: Request, @Res() res: Response) {
    const googleUser = req.user as {
      email: string;
      lastName: string;
      firstName: string;
      id: string;
      provider: string;
    };
    let user = await this.authService.getUser(googleUser.email);
    if (!user) {
      const createdUser = await this.authService.createUserFromProvider({
        email: googleUser.email,
        provider: 'google',
        name:
          googleUser.firstName && googleUser.lastName
            ? googleUser.firstName + ' ' + googleUser.lastName
            : googleUser.firstName
              ? googleUser.firstName
              : googleUser.lastName
                ? googleUser.lastName
                : '',
      });
      user = createdUser;
    }

    await new Promise<void>((resolve, reject) => {
      req.logIn(user!, (err) => {
        if (err) {
          this.logger.error('Login error after Google OAuth:', err);
          return reject(err);
        }
        resolve();
      });
    });
    req.session.userId = user!.id;
    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          this.logger.error('Session save error after Google OAuth:', err);
          return reject(err);
        }
        resolve();
      });
    });

    return res.redirect(process.env.FRONTEND_URL!);
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

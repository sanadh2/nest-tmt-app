import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import {
  Injectable,
  UnauthorizedException,
  HttpException,
  Logger,
} from '@nestjs/common';
import { AuthService } from '../../auth/auth.service';
import { userToPublicUser } from 'src/utils/user';
import { PublicUser } from 'src/drizzle/schema';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(LocalStrategy.name);

  constructor(private authService: AuthService) {
    super({
      usernameField: 'identifier',
      passwordField: 'password',
    });
    this.logger.log('LocalStrategy initialized');
  }

  async validate(identifier: string, password: string): Promise<PublicUser> {
    this.logger.debug(`Attempting to validate user: ${identifier}`);

    try {
      const user = await this.authService.verifyLoginCredentials({
        identifier,
        password,
      });

      if (!user) {
        this.logger.warn(
          `Authentication failed - no user returned for identifier: ${identifier}`,
        );
        throw new UnauthorizedException('Invalid credentials');
      }

      const publicUser = userToPublicUser(user);
      this.logger.debug(`User validated successfully: ${identifier}`);
      return publicUser;
    } catch (error) {
      if (error instanceof HttpException) {
        this.logger.warn(
          `Authentication error for ${identifier}: ${error.message}`,
        );
        throw new UnauthorizedException(error.message);
      }
      this.logger.error(
        `Unexpected authentication error for ${identifier}:`,
        error,
      );
      throw new UnauthorizedException('Authentication failed');
    }
  }
}

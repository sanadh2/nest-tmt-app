// local.strategy.ts
import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../../auth/auth.service';
import { userToPublicUser } from 'src/utils/user';
import { PublicUser } from 'src/drizzle/schema';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'identifier' });
  }

  async validate(identifier: string, password: string): Promise<PublicUser> {
    const user = await this.authService.verifyLoginCredentials({
      identifier,
      password,
    });

    if (!user) {
          console.error('🔴 Authentication failed for identifier:', identifier);
      throw new UnauthorizedException();
    }

    return userToPublicUser(user);
  }
}

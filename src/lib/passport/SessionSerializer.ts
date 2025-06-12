import { PassportSerializer } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { PublicUser } from 'src/drizzle/schema';
import { UserService } from 'src/user/user.service';
import { userToPublicUser } from 'src/utils/user';

@Injectable()
export class SessionSerializer extends PassportSerializer {
  constructor(private readonly userService: UserService) {
    super();
  }
  serializeUser(
    user: PublicUser,
    done: (err: Error | null, user: any) => void,
  ): any {
    done(null, user.id);
  }

  async deserializeUser(
    userId: string,
    done: (err: Error | null, payload: { id: string } | null) => void,
  ) {
    const user = await this.userService.findUserByIdentifier(userId);
    if (!user) return done(new Error('User not found'), null);
    done(null, { id: userId });
  }
}

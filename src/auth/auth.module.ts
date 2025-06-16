import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MailModule } from 'src/mail/mail.module';
import { RedisModule } from 'src/lib/redis/redis.module';
import { UserModule } from 'src/user/user.module';
import { UserRepository } from 'src/user/user.repository';
import { PassportModule } from '@nestjs/passport';
import { GoogleStrategy } from 'src/lib/passport/google.strategy';
import { SessionSerializer } from 'src/lib/passport/SessionSerializer';
import { LocalStrategy } from 'src/lib/passport/local.strategy';
import { AuthenticatedGuard } from './auth.guard';

@Module({
  imports: [
    MailModule,
    RedisModule,
    UserModule,
    PassportModule.register({
      session: true,
      defaultStrategy: 'local',
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    UserRepository,
    LocalStrategy,
    GoogleStrategy,
    SessionSerializer,
    AuthenticatedGuard,
  ],
  exports: [AuthService],
})
export class AuthModule {}

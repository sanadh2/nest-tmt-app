import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MailModule } from 'src/mail/mail.module';
import { RedisModule } from 'src/redis/redis.module';
import { UserModule } from 'src/user/user.module';
import { UserRepository } from 'src/user/user.repository';

@Module({
  controllers: [AuthController],
  providers: [AuthService, UserRepository],
  imports: [MailModule, RedisModule, UserModule],
})
export class AuthModule {}

import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { UserController } from './user.controller';
import { MailService } from 'src/mail/mail.service';
import { RedisModule } from 'src/redis/redis.module';

@Module({
  imports: [RedisModule],
  controllers: [UserController],
  providers: [UserService, UserRepository, MailService],
  exports: [UserService],
})
export class UserModule {}

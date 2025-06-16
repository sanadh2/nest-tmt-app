import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { SessionRenewalMiddleware } from './middleware/renewSession.middleware';
import { CsrfMiddleware } from './middleware/csrf.middleware';

@Module({
  imports: [AuthModule, UserModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SessionRenewalMiddleware, CsrfMiddleware).forRoutes('*');
  }
}

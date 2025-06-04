import csrf from 'csurf';
import { NestMiddleware, Injectable } from '@nestjs/common';
import { env } from '../config/env.validation';

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    return csrf({
      cookie: {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'strict',
      },
    })(req, res, next);
  }
}

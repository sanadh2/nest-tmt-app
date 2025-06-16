import csrf from 'csurf';
import { NestMiddleware, Injectable } from '@nestjs/common';
import { env } from '../config/env.validation';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (req.path === '/auth' && req.method === 'POST') {
      return next();
    }

    return csrf({
      cookie: {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'strict',
      },
      ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
    })(req, res, next);
  }
}

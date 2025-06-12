import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class SessionRenewalMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const now = Date.now();
    const renewalThreshold = 1000 * 60 * 15;

    if (req.session) {
      if (req.session.lastRenewed) {
        const timeSinceLastRenewal = now - req.session.lastRenewed;
        if (timeSinceLastRenewal > renewalThreshold) {
          req.session.touch();
          req.session.lastRenewed = now;
        }
      } else {
        req.session.lastRenewed = now;
      }
    }

    next();
  }
}

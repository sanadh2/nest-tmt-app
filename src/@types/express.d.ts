import 'express-session';
import 'express';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    lastRenewed?: number;
  }
}

declare module 'express' {
  interface Request {
    user?: { id: string };
    csrfToken?(): string;
    session: import('express-session').Session &
      Partial<import('express-session').SessionData>;
  }
}

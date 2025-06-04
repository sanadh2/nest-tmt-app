// src/@types/express/index.d.ts
import 'express-session'; // Import this to ensure SessionData is recognized
import 'express';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
  }
}

declare module 'express' {
  interface Request {
    csrfToken?(): string;
  }
}

// This augments the Express.Request interface globally
declare global {
  namespace Express {
    interface Request {
      // session: session.Session & Partial<session.SessionData>; // Original suggestion
      // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
      session: import('express-session').Session &
        Partial<import('express-session').SessionData>; // More explicit
    }
  }
}

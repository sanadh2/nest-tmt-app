import { Test, TestingModule } from '@nestjs/testing';
import { SessionRenewalMiddleware } from './renewSession.middleware';
import { Request, Response, NextFunction } from 'express';
import { Session } from 'express-session';

interface SessionWithLastRenewed extends Session {
  lastRenewed?: number;
}

describe('SessionRenewalMiddleware', () => {
  let middleware: SessionRenewalMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SessionRenewalMiddleware],
    }).compile();

    middleware = module.get<SessionRenewalMiddleware>(SessionRenewalMiddleware);
    mockNext = jest.fn();
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  describe('use', () => {
    it('should set lastRenewed if not present', () => {
      const mockSession = {
        touch: jest.fn(),
      } as Partial<SessionWithLastRenewed>;
      mockRequest = {
        session: mockSession as SessionWithLastRenewed,
      };
      mockResponse = {};

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockSession.lastRenewed).toBeDefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should renew session if threshold exceeded', () => {
      const fifteenMinutesAgo = Date.now() - (1000 * 60 * 16); // 16 minutes ago
      const mockSession = {
        lastRenewed: fifteenMinutesAgo,
        touch: jest.fn(),
      } as Partial<SessionWithLastRenewed>;
      mockRequest = {
        session: mockSession as SessionWithLastRenewed,
      };
      mockResponse = {};

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockSession.touch).toHaveBeenCalled();
      expect(mockSession.lastRenewed).toBeGreaterThan(fifteenMinutesAgo);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should not renew session if threshold not exceeded', () => {
      const fiveMinutesAgo = Date.now() - (1000 * 60 * 5); // 5 minutes ago
      const mockSession = {
        lastRenewed: fiveMinutesAgo,
        touch: jest.fn(),
      } as Partial<SessionWithLastRenewed>;
      mockRequest = {
        session: mockSession as SessionWithLastRenewed,
      };
      mockResponse = {};

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockSession.touch).not.toHaveBeenCalled();
      expect(mockSession.lastRenewed).toBe(fiveMinutesAgo);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle request without session', () => {
      mockRequest = {};
      mockResponse = {};

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle session without lastRenewed property', () => {
      const mockSession = {
        touch: jest.fn(),
      } as Partial<SessionWithLastRenewed>;
      mockRequest = {
        session: mockSession as SessionWithLastRenewed,
      };
      mockResponse = {};

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockSession.lastRenewed).toBeDefined();
      expect(mockNext).toHaveBeenCalled();
    });
  });
}); 
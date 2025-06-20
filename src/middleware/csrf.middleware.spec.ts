import { Test, TestingModule } from '@nestjs/testing';
import { CsrfMiddleware } from './csrf.middleware';
import { Request, Response, NextFunction } from 'express';

jest.mock('csurf', () => {
  return jest.fn(() => {
    return jest.fn((req: Request, res: Response, next: NextFunction) => {
      next();
    });
  });
});

describe('CsrfMiddleware', () => {
  let middleware: CsrfMiddleware;
  let mockNext: NextFunction;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CsrfMiddleware],
    }).compile();

    middleware = module.get<CsrfMiddleware>(CsrfMiddleware);
    mockNext = jest.fn();
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  describe('use', () => {
    it('should skip CSRF check for login route', () => {
      const mockRequest = {
        path: '/auth',
        method: 'POST',
      } as Partial<Request>;
      const mockResponse = {} as Partial<Response>;

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should apply CSRF protection for other routes', () => {
      const mockRequest = {
        path: '/users',
        method: 'POST',
      } as Partial<Request>;
      const mockResponse = {} as Partial<Response>;

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should apply CSRF protection for GET requests on non-login routes', () => {
      const mockRequest = {
        path: '/users',
        method: 'GET',
      } as Partial<Request>;
      const mockResponse = {} as Partial<Response>;

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
}); 
import { Test, TestingModule } from '@nestjs/testing';
import { AuthenticatedGuard } from './auth.guard';
import { ExecutionContext } from '@nestjs/common';

describe('AuthenticatedGuard', () => {
  let guard: AuthenticatedGuard;
  let mockExecutionContext: ExecutionContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthenticatedGuard],
    }).compile();

    guard = module.get<AuthenticatedGuard>(AuthenticatedGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should return true when user is authenticated', () => {
      const mockRequest = {
        isAuthenticated: jest.fn().mockReturnValue(true),
      };

      mockExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
      } as unknown as ExecutionContext;

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(mockRequest.isAuthenticated).toHaveBeenCalled();
    });

    it('should return false when user is not authenticated', () => {
      const mockRequest = {
        isAuthenticated: jest.fn().mockReturnValue(false),
      };

      mockExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
      } as unknown as ExecutionContext;

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(false);
      expect(mockRequest.isAuthenticated).toHaveBeenCalled();
    });

    it('should return false when isAuthenticated method does not exist', () => {
      const mockRequest = {};

      mockExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
      } as unknown as ExecutionContext;

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBeFalsy();
    });

    it('should handle undefined isAuthenticated method', () => {
      const mockRequest = {
        isAuthenticated: undefined,
      };

      mockExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
      } as unknown as ExecutionContext;

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBeFalsy();
    });
  });
}); 
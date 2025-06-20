import { config } from 'dotenv';
config();
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginDto } from '../dtos/user.dto';
import { Request, Response } from 'express';
import { HttpStatus, HttpException } from '@nestjs/common';
import { User } from '../drizzle/schema';
import { Session } from 'express-session';

const mockAuthService = {
  verifyLoginCredentials: jest.fn(),
  getUser: jest.fn(),
  addSessionForUser: jest.fn(),
  removeSessionForUser: jest.fn(),
  logoutAll: jest.fn(),
  createUserFromProvider: jest.fn(),
};

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeAll(() => {
    require('dotenv').config({ path: '.env.test' });
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockSession: Partial<Session> & { userId?: string } = {
      id: 'mockSessionId',
      cookie: {
        originalMaxAge: 0,
        expires: new Date(),
        secure: false,
        httpOnly: false,
        domain: undefined,
        path: '/',
        sameSite: undefined,
      },
      regenerate: jest.fn(function (this: Session, cb?: (err: any) => void) {
        cb?.(null);
        return this;
      }) as unknown as Session['regenerate'],

      destroy: jest.fn(function (this: Session, cb?: (err: any) => void) {
        cb?.(null);
        return this;
      }) as unknown as Session['destroy'],
      reload: jest.fn(function (this: Session, cb?: (err: any) => void) {
        cb?.(null);
        return this;
      }) as unknown as Session['reload'],

      save: jest.fn(function (this: Session, cb?: (err: any) => void) {
        cb?.(null);
        return this;
      }) as unknown as Session['save'],

      touch: jest.fn(),
      userId: '',
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      clearCookie: jest.fn(),
      redirect: jest.fn(),
    };

    mockRequest = {
      session: mockSession as Session,
      sessionID: 'mockSessionId',
      user: undefined,
      logIn: jest.fn().mockImplementation((user, callback) => {
        if (callback) callback(null);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getCsrfToken', () => {
    it('should return CSRF token', () => {
      const mockCsrfToken = 'mock-csrf-token';
      mockRequest.csrfToken = jest.fn().mockReturnValue(mockCsrfToken);

      controller.getCsrfToken(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({ csrfToken: mockCsrfToken });
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      identifier: 'test@example.com',
      password: 'password123',
    };
    const mockUser = {
      id: 'someUserId',
      email: 'test@example.com',
      name: 'Test User',
    };

    it('should successfully log in a user and set session userId', async () => {
      mockRequest.user = mockUser;
      (authService.addSessionForUser as jest.Mock).mockResolvedValue(undefined);

      await controller.login(
        loginDto,
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockRequest.session?.userId).toBe(mockUser.id);
      expect(authService.addSessionForUser).toHaveBeenCalledWith(mockUser.id, 'mockSessionId');
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockResponse.json).toHaveBeenCalledWith(mockUser);
    });

    it('should throw UnauthorizedException if no user in request', async () => {
      mockRequest.user = undefined;

      await expect(
        controller.login(
          loginDto,
          mockRequest as Request,
          mockResponse as Response,
        ),
      ).rejects.toThrow(new HttpException('Authentication failed', HttpStatus.UNAUTHORIZED));

      expect(authService.addSessionForUser).not.toHaveBeenCalled();
    });

    it('should handle login errors', async () => {
      mockRequest.user = mockUser;
      mockRequest.logIn = jest.fn().mockImplementation((user, callback) => {
        if (callback) callback(new Error('Login failed'));
      });
      (authService.addSessionForUser as jest.Mock).mockResolvedValue(undefined);

      await expect(
        controller.login(
          loginDto,
          mockRequest as Request,
          mockResponse as Response,
        ),
      ).rejects.toThrow(new HttpException('Login failed', HttpStatus.INTERNAL_SERVER_ERROR));
    });
  });

  describe('googleAuthRedirect', () => {
    const mockGoogleUser = {
      email: 'google@example.com',
      firstName: 'John',
      lastName: 'Doe',
      id: 'google123',
      provider: 'google',
    };

    it('should create new user and redirect if user does not exist', async () => {
      mockRequest.user = mockGoogleUser;
      (authService.getUser as jest.Mock).mockResolvedValue(null);
      (authService.createUserFromProvider as jest.Mock).mockResolvedValue({
        id: 'newUserId',
        email: 'google@example.com',
        name: 'John Doe',
      });
      (authService.addSessionForUser as jest.Mock).mockResolvedValue(undefined);

      await controller.googleAuthRedirect(mockRequest as Request, mockResponse as Response);

      expect(authService.createUserFromProvider).toHaveBeenCalledWith({
        email: 'google@example.com',
        provider: 'google',
        name: 'John Doe',
      });
      expect(authService.addSessionForUser).toHaveBeenCalled();
      expect(mockResponse.redirect).toHaveBeenCalledWith(process.env.FRONTEND_URL);
    });

    it('should use existing user and redirect if user exists', async () => {
      const existingUser = {
        id: 'existingUserId',
        email: 'google@example.com',
        name: 'John Doe',
      };
      mockRequest.user = mockGoogleUser;
      (authService.getUser as jest.Mock).mockResolvedValue(existingUser);
      (authService.addSessionForUser as jest.Mock).mockResolvedValue(undefined);

      await controller.googleAuthRedirect(mockRequest as Request, mockResponse as Response);

      expect(authService.createUserFromProvider).not.toHaveBeenCalled();
      expect(authService.addSessionForUser).toHaveBeenCalledWith(existingUser.id, 'mockSessionId');
      expect(mockResponse.redirect).toHaveBeenCalledWith(process.env.FRONTEND_URL);
    });
  });

  describe('getProfile', () => {
    const mockUser = {
      id: 'someUserId',
      email: 'test@example.com',
      name: 'Test User',
    };

    it('should return user details if authenticated', async () => {
      mockRequest.user = { id: mockUser.id };
      (authService.getUser as jest.Mock).mockResolvedValue(mockUser);

      const result = await controller.getProfile(mockRequest as Request);

      expect(authService.getUser).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException if not authenticated', async () => {
      mockRequest.user = undefined;

      await expect(
        controller.getProfile(mockRequest as Request),
      ).rejects.toThrow(new HttpException('Unauthorised', HttpStatus.UNAUTHORIZED));

      expect(authService.getUser).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    const mockUser = { id: 'someUserId' };

    it('should logout user from current device', async () => {
      mockRequest.user = mockUser;
      (authService.removeSessionForUser as jest.Mock).mockResolvedValue(undefined);

      await controller.logout(mockRequest as Request, mockResponse as Response);

      expect(authService.removeSessionForUser).toHaveBeenCalledWith(mockUser.id, 'mockSessionId');
      expect(mockRequest.session?.destroy).toHaveBeenCalled();
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('connect.sid');
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Logged out from current device' });
    });

    it('should throw UnauthorizedException if no user or session', async () => {
      mockRequest.user = undefined;

      await expect(
        controller.logout(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow(new HttpException('Oh, oh!', HttpStatus.UNAUTHORIZED));
    });
  });

  describe('logoutAll', () => {
    const mockUser = { id: 'someUserId' };

    it('should logout user from all devices', async () => {
      mockRequest.user = mockUser;
      (authService.logoutAll as jest.Mock).mockResolvedValue(undefined);

      await controller.logoutAll(mockRequest as Request, mockResponse as Response);

      expect(authService.logoutAll).toHaveBeenCalledWith(mockUser.id);
      expect(mockRequest.session?.destroy).toHaveBeenCalled();
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('connect.sid');
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Logged out from all devices' });
    });

    it('should throw UnauthorizedException if no user', async () => {
      mockRequest.user = undefined;

      await expect(
        controller.logoutAll(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow(new HttpException('Oh, oh!', HttpStatus.UNAUTHORIZED));
    });
  });
});

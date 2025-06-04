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
      // Required Session properties/methods (even if mocked minimally)
      id: 'mockSessionId',
      cookie: {
        // Minimal mock for cookie
        originalMaxAge: 0,
        expires: new Date(),
        secure: false,
        httpOnly: false,
        domain: undefined,
        path: '/',
        sameSite: undefined,
      },
      regenerate: jest.fn(function (this: Session, cb?: (err: any) => void) {
        cb?.(null); // Call callback with no error
        return this; // Return the session object for chaining
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
    };

    mockRequest = {
      session: mockSession as Session,
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

  describe('login', () => {
    const loginDto: LoginDto = {
      identifier: 'test@example.com',
      password: 'password123',
    };
    const mockUser: Partial<User> = {
      id: 'someUserId',
      email: 'test@example.com',
    };

    it('should successfully log in a user and set session userId', async () => {
      (authService.verifyLoginCredentials as jest.Mock).mockResolvedValue(
        mockUser,
      );

      await controller.login(
        loginDto,
        mockRequest as Request,
        mockResponse as Response,
      );

      // Assert
      expect(authService.verifyLoginCredentials).toHaveBeenCalledWith(loginDto);
      expect(mockRequest.session?.userId).toBe(mockUser.id);
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'logged in' });
    });

    it('should handle failed login attempts', async () => {
      // Arrange
      const errorMessage = 'Invalid credentials';
      (authService.verifyLoginCredentials as jest.Mock).mockRejectedValue(
        new HttpException(errorMessage, HttpStatus.BAD_REQUEST),
      );

      // Act & Assert - Expect the controller to re-throw the HttpException
      await expect(
        controller.login(
          loginDto,
          mockRequest as Request,
          mockResponse as Response,
        ),
      ).rejects.toThrow(HttpException);

      expect(mockResponse.status).not.toHaveBeenCalled(); // Response shouldn't be sent by controller
      expect(mockResponse.json).not.toHaveBeenCalled();
    });
  });

  describe('me', () => {
    const mockUser: Partial<User> = {
      id: 'someUserId',
      email: 'test@example.com',
    };

    it('should return user details if authenticated', async () => {
      mockRequest.session!.userId = mockUser.id;
      (authService.getUser as jest.Mock).mockResolvedValue(mockUser);

      // Act
      await controller.me(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(authService.getUser).toHaveBeenCalledWith(mockUser.id);
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockResponse.json).toHaveBeenCalledWith({ user: mockUser });
    });

    it('should throw UnauthorizedException if not authenticated', async () => {
      // Arrange
      mockRequest.session!.userId = undefined; // Simulate no logged-in user

      // Act & Assert
      await expect(
        controller.me(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow(
        new HttpException('Unauthorised', HttpStatus.UNAUTHORIZED),
      );

      expect(authService.getUser).not.toHaveBeenCalled(); // getUser should not be called
      expect(mockResponse.status).not.toHaveBeenCalled(); // No response sent
      expect(mockResponse.json).not.toHaveBeenCalled();
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { LocalStrategy } from './local.strategy';
import { AuthService } from '../../auth/auth.service';
import { UnauthorizedException } from '@nestjs/common';
import { User } from '../../drizzle/schema';
import { userToPublicUser } from '../../utils/user';

const mockAuthService = {
  verifyLoginCredentials: jest.fn(),
};

jest.mock('../../utils/user', () => ({
  userToPublicUser: jest.fn(),
}));

describe('LocalStrategy', () => {
  let strategy: LocalStrategy;
  let authService: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalStrategy,
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    strategy = module.get<LocalStrategy>(LocalStrategy);
    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    const identifier = 'test@example.com';
    const password = 'password123';
    const mockUser: User = {
      id: 'userId123',
      email: identifier,
      password: 'hashedPassword',
      isVerified: true,
      name: 'Test User',
      createdAt: new Date(),
      isDeleted: false,
      username: null,
    };
    const mockPublicUser = {
      id: mockUser.id,
      email: mockUser.email,
      name: mockUser.name,
      createdAt: mockUser.createdAt,
      username: mockUser.username,
    };

    it('should return public user if credentials are valid', async () => {
      (authService.verifyLoginCredentials as jest.Mock).mockResolvedValue(mockUser);
      (userToPublicUser as jest.Mock).mockReturnValue(mockPublicUser);

      const result = await strategy.validate(identifier, password);

      expect(authService.verifyLoginCredentials).toHaveBeenCalledWith({
        identifier,
        password,
      });
      expect(userToPublicUser).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockPublicUser);
    });

    it('should throw UnauthorizedException if no user returned', async () => {
      (authService.verifyLoginCredentials as jest.Mock).mockResolvedValue(null);

      await expect(strategy.validate(identifier, password)).rejects.toThrow(
        new UnauthorizedException('Invalid credentials'),
      );
    });

    it('should throw UnauthorizedException if AuthService throws HttpException', async () => {
      const httpException = new Error('Invalid credentials');
      (authService.verifyLoginCredentials as jest.Mock).mockRejectedValue(httpException);

      await expect(strategy.validate(identifier, password)).rejects.toThrow(
        new UnauthorizedException('Authentication failed'),
      );
    });

    it('should throw UnauthorizedException for unexpected errors', async () => {
      const unexpectedError = new Error('Database connection failed');
      (authService.verifyLoginCredentials as jest.Mock).mockRejectedValue(unexpectedError);

      await expect(strategy.validate(identifier, password)).rejects.toThrow(
        new UnauthorizedException('Authentication failed'),
      );
    });
  });
}); 
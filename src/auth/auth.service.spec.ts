import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UserRepository } from '../user/user.repository';
import Redis from 'ioredis';
import { HttpException, HttpStatus } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from '../drizzle/schema';
import { userToPublicUser } from '../utils/user';

const mockUserRepository = {
  findUserByIdentifier: jest.fn(),
  verifyUser: jest.fn(),
};

jest.mock('nodemailer-express-handlebars', () => {
  return jest.fn(() => ({
    compile: jest.fn(),
    configure: jest.fn(),
  }));
});

const mockRedis = {
  set: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
  sadd: jest.fn(),
  srem: jest.fn(),
  smembers: jest.fn(),
  pipeline: jest.fn(() => ({
    del: jest.fn().mockReturnThis(),
    exec: jest.fn(),
  })),
};

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

jest.mock('crypto', () => ({
  randomUUID: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: UserRepository;
  let redis: Redis;

  beforeAll(() => {
    require('dotenv').config({ path: '.env.test' });
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserRepository,
          useValue: mockUserRepository,
        },
        {
          provide: 'REDIS_CLIENT',
          useValue: mockRedis,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<UserRepository>(UserRepository);
    redis = module.get<Redis>('REDIS_CLIENT');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('verifyLoginCredentials', () => {
    const identifier = 'test@example.com';
    const password = 'password123';
    const hashedPassword = 'hashedPassword123';
    const mockUser: User = {
      id: 'userId123',
      email: identifier,
      password: hashedPassword,
      isVerified: true,
      name: 'Test User',
      createdAt: new Date(),
      isDeleted: false,
      username: null,
    };

    it('should return user if credentials are valid and user is verified', async () => {
      (userRepository.findUserByIdentifier as jest.Mock).mockResolvedValue(
        mockUser,
      );
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.verifyLoginCredentials({
        identifier,
        password,
      });

      expect(userRepository.findUserByIdentifier).toHaveBeenCalledWith(
        identifier,
      );
      expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
      expect(result).toEqual(mockUser);
    });

    it('should throw HttpException if user not found', async () => {
      (userRepository.findUserByIdentifier as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(
        service.verifyLoginCredentials({ identifier, password }),
      ).rejects.toThrow(
        new HttpException('user not found', HttpStatus.NOT_FOUND),
      );
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw HttpException and set verify token if user is not verified', async () => {
      const unverifiedUser = { ...mockUser, isVerified: false };
      (userRepository.findUserByIdentifier as jest.Mock).mockResolvedValue(
        unverifiedUser,
      );
      (crypto.randomUUID as jest.Mock).mockReturnValue('mockToken');
      (redis.set as jest.Mock).mockResolvedValue('OK');

      await expect(
        service.verifyLoginCredentials({ identifier, password }),
      ).rejects.toThrow(
        new HttpException(
          'user is not verified, please verify',
          HttpStatus.BAD_REQUEST,
        ),
      );
      expect(redis.set).toHaveBeenCalledWith(
        'verify-token:mockToken',
        unverifiedUser.id,
        'EX',
        3600,
      );
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw HttpException if password does not match', async () => {
      (userRepository.findUserByIdentifier as jest.Mock).mockResolvedValue(
        mockUser,
      );
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.verifyLoginCredentials({ identifier, password }),
      ).rejects.toThrow(
        new HttpException('password does not match', HttpStatus.BAD_REQUEST),
      );
    });
  });

  describe('verifyUser', () => {
    const verifyToken = 'mockToken123';
    const userId = 'userId123';
    const mockUser: User = {
      id: userId,
      email: 'test@example.com',
      password: 'hashedPassword',
      isVerified: false,
      name: 'Test User',
      createdAt: new Date(),
      isDeleted: false,
      username: null,
    };

    it('should verify the user successfully', async () => {
      (redis.get as jest.Mock).mockResolvedValue(userId);
      (userRepository.findUserByIdentifier as jest.Mock).mockResolvedValue(
        mockUser,
      );
      (userRepository.verifyUser as jest.Mock).mockResolvedValue(undefined);
      (redis.del as jest.Mock).mockResolvedValue(1);

      await service.verifyUser(verifyToken);

      expect(redis.get).toHaveBeenCalledWith(`verify-token:${verifyToken}`);
      expect(redis.del).toHaveBeenCalledWith(`verify-token:${verifyToken}`);
      expect(userRepository.findUserByIdentifier).toHaveBeenCalledWith(userId);
      expect(userRepository.verifyUser).toHaveBeenCalledWith(userId);
    });

    it('should throw HttpException if token expired', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);

      await expect(service.verifyUser(verifyToken)).rejects.toThrow(
        new HttpException('token expired', HttpStatus.BAD_REQUEST),
      );
      expect(redis.del).not.toHaveBeenCalled();
      expect(userRepository.findUserByIdentifier).not.toHaveBeenCalled();
      expect(userRepository.verifyUser).not.toHaveBeenCalled();
    });

    it('should throw HttpException if user not found after token lookup', async () => {
      (redis.get as jest.Mock).mockResolvedValue(userId);
      (userRepository.findUserByIdentifier as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(service.verifyUser(verifyToken)).rejects.toThrow(
        new HttpException('user not found', HttpStatus.BAD_REQUEST),
      );
      expect(redis.del).toHaveBeenCalledWith(`verify-token:${verifyToken}`);
      expect(userRepository.verifyUser).not.toHaveBeenCalled();
    });
  });

  describe('resendVerificationEmail', () => {
    const identifier = 'test@example.com';
    const projectId = 'someProjectId';
    const mockUser: User = {
      id: 'userId123',
      email: identifier,
      password: 'hashedPassword',
      isVerified: false,
      name: 'Test User',
      createdAt: new Date(),
      isDeleted: false,
      username: '',
    };

    it('should resend verification email and return a new token', async () => {
      (userRepository.findUserByIdentifier as jest.Mock).mockResolvedValue(
        mockUser,
      );
      (redis.incr as jest.Mock).mockResolvedValue(1);
      (redis.expire as jest.Mock).mockResolvedValue(1);
      (crypto.randomUUID as jest.Mock).mockReturnValue('newToken456');
      (redis.set as jest.Mock).mockResolvedValue('OK');

      const result = await service.resendVerificationEmail(
        identifier,
        projectId,
      );

      expect(userRepository.findUserByIdentifier).toHaveBeenCalledWith(
        identifier,
      );
      expect(redis.incr).toHaveBeenCalledWith(`resend-limit:${mockUser.id}`);
      expect(redis.expire).toHaveBeenCalledWith(
        `resend-limit:${mockUser.id}`,
        3600,
      );
      expect(crypto.randomUUID).toHaveBeenCalled();
      expect(redis.set).toHaveBeenCalledWith(
        'verify-token:newToken456',
        mockUser.id,
        'EX',
        3600,
      );
      expect(result).toEqual({ token: 'newToken456' });
    });

    it('should throw HttpException if user not found', async () => {
      (userRepository.findUserByIdentifier as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(
        service.resendVerificationEmail(identifier, projectId),
      ).rejects.toThrow(
        new HttpException('User not found', HttpStatus.NOT_FOUND),
      );
      expect(redis.incr).not.toHaveBeenCalled();
    });

    it('should throw HttpException if user is already verified', async () => {
      const verifiedUser = { ...mockUser, isVerified: true };
      (userRepository.findUserByIdentifier as jest.Mock).mockResolvedValue(
        verifiedUser,
      );

      await expect(
        service.resendVerificationEmail(identifier, projectId),
      ).rejects.toThrow(
        new HttpException('User is already verified', HttpStatus.BAD_REQUEST),
      );
      expect(redis.incr).not.toHaveBeenCalled();
    });

    it('should throw HttpException for too many resend attempts', async () => {
      (userRepository.findUserByIdentifier as jest.Mock).mockResolvedValue(
        mockUser,
      );
      (redis.incr as jest.Mock).mockResolvedValue(4); // 4 attempts

      await expect(
        service.resendVerificationEmail(identifier, projectId),
      ).rejects.toThrow(
        new HttpException(
          'Too many resend attempts. Try again after 1 hour.',
          HttpStatus.TOO_MANY_REQUESTS,
        ),
      );
      expect(redis.expire).not.toHaveBeenCalled(); // expire is only called on the first attempt
      expect(crypto.randomUUID).not.toHaveBeenCalled();
      expect(redis.set).not.toHaveBeenCalled();
    });
  });

  describe('getUser', () => {
    const userId = 'userId123';
    const mockUser: User = {
      id: userId,
      email: 'test@example.com',
      password: 'hashedPassword',
      isVerified: true,
      name: 'Test User',
      createdAt: new Date(),
      isDeleted: false,
      username: '',
    };
    const mockPublicUser = userToPublicUser(mockUser);

    it('should return public user details if user exists', async () => {
      (userRepository.findUserByIdentifier as jest.Mock).mockResolvedValue(
        mockUser,
      );

      const result = await service.getUser(userId);
      expect(userRepository.findUserByIdentifier).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockPublicUser);
    });

    it('should return null if user does not exist', async () => {
      (userRepository.findUserByIdentifier as jest.Mock).mockResolvedValue(
        null,
      );

      const result = await service.getUser(userId);
      expect(userRepository.findUserByIdentifier).toHaveBeenCalledWith(userId);
      expect(result).toBeNull();
    });
  });

  describe('addSessionForUser', () => {
    const userId = 'userId123';
    const sessionId = 'sessionId123';

    it('should add a session for the user', async () => {
      (redis.sadd as jest.Mock).mockResolvedValue(1);

      await service.addSessionForUser(userId, sessionId);

      expect(redis.sadd).toHaveBeenCalledWith(
        `user-sessions:${userId}`,
        sessionId,
      );
    });
  });

  describe('removeSessionForUser', () => {
    const userId = 'userId123';
    const sessionId = 'sessionId123';

    it('should remove a session for the user', async () => {
      (redis.srem as jest.Mock).mockResolvedValue(1);

      await service.removeSessionForUser(userId, sessionId);

      expect(redis.srem).toHaveBeenCalledWith(
        `user-sessions:${userId}`,
        sessionId,
      );
    });
  });

  describe('logoutAll', () => {
    const userId = 'userId123';
    const sessionIds = ['sess1', 'sess2'];

    it('should remove all sessions for a given user', async () => {
      (mockRedis.smembers as jest.Mock).mockResolvedValue(sessionIds);
      const mockPipeline = {
        del: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      (mockRedis.pipeline as jest.Mock).mockReturnValue(mockPipeline);

      await service.logoutAll(userId);

      expect(mockRedis.smembers).toHaveBeenCalledWith(
        `user-sessions:${userId}`,
      );
      expect(mockRedis.pipeline).toHaveBeenCalled();
      expect(mockPipeline.del).toHaveBeenCalledWith(`sess:${sessionIds[0]}`);
      expect(mockPipeline.del).toHaveBeenCalledWith(`sess:${sessionIds[1]}`);
      expect(mockPipeline.del).toHaveBeenCalledWith(`user-sessions:${userId}`);
      expect(mockPipeline.exec).toHaveBeenCalled();
    });

    it('should do nothing if no active sessions are found', async () => {
      (redis.smembers as jest.Mock).mockResolvedValue([]);

      await service.logoutAll(userId);

      expect(redis.smembers).toHaveBeenCalledWith(`user-sessions:${userId}`);
      expect(redis.pipeline).not.toHaveBeenCalled();
    });
  });
});

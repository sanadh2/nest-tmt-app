import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { PublicUser, User } from '../drizzle/schema';
import bcrypt from 'bcrypt';
import Redis from 'ioredis';
import crypto from 'crypto';
import { UserRepository } from '../user/user.repository';
import { userToPublicUser } from '../utils/user';

enum RedisKeys {
  VerifyToken = 'verify-token',
  ResendLimit = 'resend-limit',
  UserSessions = 'user-sessions',
}

@Injectable()
export class AuthService {
  constructor(
    private userRepository: UserRepository,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  private readonly logger = new Logger(AuthService.name);

  async verifyLoginCredentials({
    identifier,
    password,
  }: {
    identifier: string;
    password: string;
  }): Promise<User> {
    this.logger.debug(`Attempting to verify credentials for: ${identifier}`);

    const user = await this.userRepository.findUserByIdentifier(identifier);
    if (!user) {
      this.logger.warn(
        `Login failed: No user found with identifier ${identifier}`,
      );
      throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
    }

    this.logger.debug(
      `User found: ${identifier}, checking verification status`,
    );
    if (!user.isVerified) {
      this.logger.warn(`Login failed: Unverified user ${identifier}`);
      const token = crypto.randomUUID();
      await this.redis.set('verify-token:' + token, user.id, 'EX', 3600);
      throw new HttpException(
        'Please verify your email before logging in',
        HttpStatus.FORBIDDEN,
      );
    }

    this.logger.debug(`Verifying password for user: ${identifier}`);
    const isSamePassword = await bcrypt.compare(password, user.password);
    if (!isSamePassword) {
      this.logger.warn(`Login failed: Invalid password for user ${identifier}`);
      throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
    }

    this.logger.log(`User ${identifier} authenticated successfully`);
    return user;
  }

  async verifyUser(verifyToken: string) {
    const key = `${RedisKeys.VerifyToken}:${verifyToken}`;
    const userId = await this.redis.get(key);
    if (!userId) {
      throw new HttpException('token expired', HttpStatus.BAD_REQUEST);
    }

    await this.redis.del('verify-token:' + verifyToken);

    const user = await this.userRepository.findUserByIdentifier(userId);
    if (!user) {
      throw new HttpException('user not found', HttpStatus.BAD_REQUEST);
    }

    await this.userRepository.verifyUser(userId);
  }

  async resendVerificationEmail(identifier: string, projectId: string) {
    const user = await this.userRepository.findUserByIdentifier(identifier);

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    if (user.isVerified) {
      throw new HttpException(
        'User is already verified',
        HttpStatus.BAD_REQUEST,
      );
    }

    const rateLimitKey = `${RedisKeys.ResendLimit}:${user.id}`;
    const attempts = await this.redis.incr(rateLimitKey);

    if (attempts === 1) {
      await this.redis.expire(rateLimitKey, 3600);
    }

    if (attempts > 3) {
      throw new HttpException(
        'Too many resend attempts. Try again after 1 hour.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const token = crypto.randomUUID();
    await this.redis.set('verify-token:' + token, user.id, 'EX', 3600);

    return { token };
  }

  async getUser(userId: string): Promise<PublicUser | null> {
    const user = await this.userRepository.findUserByIdentifier(userId);
    return user ? userToPublicUser(user) : null;
  }

  async addSessionForUser(userId: string, sessionId: string) {
    const key = `${RedisKeys.UserSessions}:${userId}`;
    await this.redis.sadd(key, sessionId);
    this.logger.log(`Added session ${sessionId} for user ${userId}`);
  }

  async removeSessionForUser(userId: string, sessionId: string) {
    const key = `${RedisKeys.UserSessions}:${userId}`;
    await this.redis.srem(key, sessionId);
    this.logger.log(`Removed session ${sessionId} for user ${userId}`);
  }

  async logoutAll(userId: string) {
    const userSessionsKey = `${RedisKeys.UserSessions}:${userId}`;
    const sessionIds = await this.redis.smembers(userSessionsKey);

    if (sessionIds.length > 0) {
      const pipeline = this.redis.pipeline();
      sessionIds.forEach((sessionId) => {
        pipeline.del(`sess:${sessionId}`);
      });

      pipeline.del(userSessionsKey);
      await pipeline.exec();
      this.logger.log(
        `Logged out user ${userId} from ${sessionIds.length} devices.`,
      );
    } else {
      this.logger.log(
        `No active sessions found for user ${userId} to log out from all devices.`,
      );
    }
  }

  async createUserFromProvider({
    email,
    name,
    provider,
  }: {
    email: string;
    name: string;
    provider: string;
  }): Promise<PublicUser> {
    const existingUser = await this.userRepository.findUserByIdentifier(email);

    if (existingUser) {
      return userToPublicUser(existingUser);
    }

    const userId = await this.userRepository.createUser({
      email,
      name,
      password: '',
      isVerified: true,
    });

    return this.userRepository.findUserByIdentifier(userId);
  }
}

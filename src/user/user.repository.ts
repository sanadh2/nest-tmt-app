import { Inject, Injectable, Logger } from '@nestjs/common';
import { ObjectId } from 'bson';
import { eq, or } from 'drizzle-orm';
import { db } from '../drizzle/db';
import {
  CreateUser,
  PublicUser,
  UpdateUser,
  User,
  users,
} from '../drizzle/schema';
import bcrypt from 'bcrypt';
import type Redis from 'ioredis';
import cryto from 'crypto';
import { userToPublicUser } from '../utils/user';

@Injectable()
export class UserRepository {
  private readonly logger = new Logger(UserRepository.name);

  constructor(@Inject('REDIS_CLIENT') private readonly redisClient: Redis) {}

  async setVerifyToken(email: string) {
    const token = cryto.randomBytes(32).toString('hex');
    await this.redisClient.set(token, email, 'EX', 3600 * 2);
    return token;
  }

  async getVerifyToken(token: string): Promise<string | null> {
    const value = await this.redisClient.get(token);
    if (value) {
      await this.redisClient.del(token);
    }
    return value;
  }

  async createUser(user: CreateUser) {
    const id = new ObjectId().toHexString();
    await db.insert(users).values({
      ...user,
      password: bcrypt.hashSync(user.password, 12),
      id,
    });
    return id;
  }

  async findUserByIdentifier(identifier: string) {
    this.logger.debug(`Looking up user by identifier: ${identifier}`);

    try {
      const [user] = await db
        .select()
        .from(users)
        .where(
          or(
            eq(users.username, identifier),
            eq(users.email, identifier),
            eq(users.id, identifier),
          ),
        );

      if (user) {
        this.logger.debug(`User found: ${identifier}`);
      } else {
        this.logger.debug(`No user found for identifier: ${identifier}`);
      }

      return user ?? null;
    } catch (error) {
      this.logger.error(`Error looking up user ${identifier}:`, error);
      throw error;
    }
  }

  async updateUser(user: UpdateUser): Promise<PublicUser | null> {
    const { id, email, isDeleted, isVerified, password, ...data } = user;
    const updatedUser = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning()
      .then(([u]) => u ?? null);
    return updatedUser ? userToPublicUser(updatedUser) : null;
  }

  async verifyUser(id: string): Promise<PublicUser | null> {
    const updatedUser = await db
      .update(users)
      .set({ isVerified: true })
      .where(eq(users.id, id))
      .returning()
      .then(([u]) => u ?? null);
    return updatedUser ? userToPublicUser(updatedUser) : null;
  }

  async deleteUser(id: string) {
    await db.update(users).set({ isDeleted: true }).where(eq(users.id, id));
  }
}

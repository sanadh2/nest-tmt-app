import { Inject, Injectable } from '@nestjs/common';
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

    return user ?? null;
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

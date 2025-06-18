import { Test, TestingModule } from '@nestjs/testing';
import { UserRepository } from './user.repository';
import bcrypt from 'bcrypt';
import { ObjectId } from 'bson';
import cryto from 'crypto';
import { db } from '../drizzle/db';
import { CreateUser, users } from '../drizzle/schema';
import { userToPublicUser } from '../utils/user';

jest.mock('bcrypt');
jest.mock('crypto');
jest.mock('../drizzle/db');
jest.mock('../utils/user');

describe('UserRepository', () => {
  let repo: UserRepository;
  const redisClient = {
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRepository,
        { provide: 'REDIS_CLIENT', useValue: redisClient },
      ],
    }).compile();

    repo = module.get<UserRepository>(UserRepository);

    jest.clearAllMocks();
  });

  describe('setVerifyToken', () => {
    it('should generate a token, save it to redis and return it', async () => {
      const fakeToken = 'token123';
      (cryto.randomBytes as jest.Mock).mockReturnValue({
        toString: () => fakeToken,
      });

      redisClient.set.mockResolvedValue('OK');

      const token = await repo.setVerifyToken('test@example.com');

      expect(cryto.randomBytes).toHaveBeenCalledWith(32);
      expect(redisClient.set).toHaveBeenCalledWith(
        fakeToken,
        'test@example.com',
        'EX',
        3600 * 2,
      );
      expect(token).toBe(fakeToken);
    });
  });

  describe('getVerifyToken', () => {
    it('should return the email and delete token if token exists', async () => {
      redisClient.get.mockResolvedValue('test@example.com');
      redisClient.del.mockResolvedValue(1);

      const result = await repo.getVerifyToken('token123');

      expect(redisClient.get).toHaveBeenCalledWith('token123');
      expect(redisClient.del).toHaveBeenCalledWith('token123');
      expect(result).toBe('test@example.com');
    });

    it('should return null if token does not exist', async () => {
      redisClient.get.mockResolvedValue(null);

      const result = await repo.getVerifyToken('token123');

      expect(redisClient.get).toHaveBeenCalledWith('token123');
      expect(redisClient.del).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe('createUser', () => {
    it('should hash password, insert user and return id', async () => {
      const user: CreateUser = {
        username: 'user1',
        email: 'u1@example.com',
        password: 'pass',
        name: 'name',
      };
      const fakeId = 'fakeid123';

      jest.spyOn(ObjectId.prototype, 'toHexString').mockReturnValue(fakeId);
      (bcrypt.hashSync as jest.Mock).mockReturnValue('hashedPass');
      (db.insert as jest.Mock).mockReturnValue({
        values: jest.fn().mockResolvedValue(undefined),
      });

      const id = await repo.createUser(user);

      expect(bcrypt.hashSync).toHaveBeenCalledWith('pass', 12);
      expect(db.insert).toHaveBeenCalledWith(users);
      expect(id).toBe(fakeId);
    });
  });

  describe('findUserByIdentifier', () => {
    it('should return user if found', async () => {
      const user = { id: '1', username: 'user', email: 'a@b.com' };
      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([user]),
        }),
      });

      const result = await repo.findUserByIdentifier('user');

      expect(result).toEqual(user);
    });

    it('should return null if no user found', async () => {
      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      });

      const result = await repo.findUserByIdentifier('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('updateUser', () => {
    it('should update and return public user', async () => {
      const updatedDbUser = { id: '1', username: 'user' };
      const updatePayload = { id: '1', username: 'user' };
      (db.update as jest.Mock).mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([updatedDbUser]),
          }),
        }),
      });

      (userToPublicUser as jest.Mock).mockReturnValue({
        id: '1',
        username: 'user',
      });

      const result = await repo.updateUser(updatePayload);

      expect(db.update).toHaveBeenCalledWith(users);
      expect(userToPublicUser).toHaveBeenCalledWith(updatedDbUser);
      expect(result).toEqual({ id: '1', username: 'user' });
    });

    it('should return null if no user updated', async () => {
      (db.update as jest.Mock).mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await repo.updateUser({ id: '1' } as any);

      expect(result).toBeNull();
    });
  });

  describe('verifyUser', () => {
    it('should set isVerified and return public user', async () => {
      const updatedUser = { id: '1', isVerified: true };
      (db.update as jest.Mock).mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([updatedUser]),
          }),
        }),
      });
      (userToPublicUser as jest.Mock).mockReturnValue({
        id: '1',
        isVerified: true,
      });

      const result = await repo.verifyUser('1');

      expect(result).toEqual({ id: '1', isVerified: true });
    });

    it('should return null if no user updated', async () => {
      (db.update as jest.Mock).mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await repo.verifyUser('1');

      expect(result).toBeNull();
    });
  });

  describe('deleteUser', () => {
    it('should mark user as deleted', async () => {
      const mockWhere = jest.fn().mockResolvedValue(undefined);
      const mockSet = jest.fn().mockReturnValue({
        where: mockWhere,
      });
      const mockUpdate = jest.fn().mockReturnValue({
        set: mockSet,
      });

      (db.update as jest.Mock).mockImplementation(mockUpdate);

      await repo.deleteUser('1');

      expect(mockUpdate).toHaveBeenCalledWith(users);
      expect(mockSet).toHaveBeenCalledWith({ isDeleted: true });
      expect(mockWhere).toHaveBeenCalledWith(expect.anything());
    });
  });
});

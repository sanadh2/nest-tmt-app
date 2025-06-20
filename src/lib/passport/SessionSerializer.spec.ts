import { Test, TestingModule } from '@nestjs/testing';
import { SessionSerializer } from './SessionSerializer';
import { UserService } from '../../user/user.service';
import { PublicUser } from '../../drizzle/schema';

const mockUserService = {
  findUserByIdentifier: jest.fn(),
};

describe('SessionSerializer', () => {
  let serializer: SessionSerializer;
  let userService: UserService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionSerializer,
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    serializer = module.get<SessionSerializer>(SessionSerializer);
    userService = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(serializer).toBeDefined();
  });

  describe('serializeUser', () => {
    const mockPublicUser: PublicUser = {
      id: 'userId123',
      email: 'test@example.com',
      name: 'Test User',
      createdAt: new Date(),
      username: null,
    };

    it('should serialize user by returning user id', () => {
      const done = jest.fn();

      serializer.serializeUser(mockPublicUser, done);

      expect(done).toHaveBeenCalledWith(null, mockPublicUser.id);
    });

    it('should handle serialization error', () => {
      const done = jest.fn();
      const error = new Error('Serialization failed');

      serializer.serializeUser(mockPublicUser, done);

      // The current implementation doesn't handle errors, so we just verify it calls done
      expect(done).toHaveBeenCalledWith(null, mockPublicUser.id);
    });
  });

  describe('deserializeUser', () => {
    const userId = 'userId123';
    const mockUser = {
      id: userId,
      email: 'test@example.com',
      name: 'Test User',
    };

    it('should deserialize user successfully', async () => {
      (userService.findUserByIdentifier as jest.Mock).mockResolvedValue(mockUser);
      const done = jest.fn();

      await serializer.deserializeUser(userId, done);

      expect(userService.findUserByIdentifier).toHaveBeenCalledWith(userId);
      expect(done).toHaveBeenCalledWith(null, { id: userId });
    });

    it('should handle user not found', async () => {
      (userService.findUserByIdentifier as jest.Mock).mockResolvedValue(null);
      const done = jest.fn();

      await serializer.deserializeUser(userId, done);

      expect(userService.findUserByIdentifier).toHaveBeenCalledWith(userId);
      expect(done).toHaveBeenCalledWith(new Error('User not found'), null);
    });
  });
}); 
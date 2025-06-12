import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { MailService } from '../mail/mail.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import { env } from '../config/env.validation';

const mockUserRepository = {
  findUserByIdentifier: jest.fn(),
  setVerifyToken: jest.fn(),
  createUser: jest.fn(),
  getVerifyToken: jest.fn(),
  verifyUser: jest.fn(),
  updateUser: jest.fn(),
};

const mockMailService = {
  sendMail: jest.fn(),
};

jest.mock('nodemailer-express-handlebars', () => {
  return jest.fn(() => ({
    compile: jest.fn(),
    configure: jest.fn(),
  }));
});

describe('UserService', () => {
  let service: UserService;
  let userRepository: typeof mockUserRepository;
  let mailService: typeof mockMailService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: UserRepository,
          useValue: mockUserRepository,
        },
        {
          provide: MailService,
          useValue: mockMailService,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepository = module.get(UserRepository);
    mailService = module.get(MailService);
  });

  describe('findUserByIdentifier', () => {
    it('should call findUserByIdentifier in repository and return user', async () => {
      const identifier = 'test@example.com';
      const mockUser = { id: '123', email: identifier };
      userRepository.findUserByIdentifier.mockResolvedValue(mockUser);

      const result = await service.findUserByIdentifier(identifier);

      expect(userRepository.findUserByIdentifier).toHaveBeenCalledWith(
        identifier,
      );
      expect(result).toEqual(mockUser);
    });
  });

  describe('createUser', () => {
    const user = {
      email: 'newuser@example.com',
      name: 'New User',
      username: 'newuser',
      password: 'password123',
    };

    it('should throw if email already exists', async () => {
      userRepository.findUserByIdentifier.mockResolvedValue({ id: 'existing' });

      await expect(service.createUser(user)).rejects.toThrow(
        new HttpException(
          'User already exists with email',
          HttpStatus.BAD_REQUEST,
        ),
      );
      expect(userRepository.findUserByIdentifier).toHaveBeenCalledWith(
        user.email,
      );
    });

    it('should throw if username already exists', async () => {
      userRepository.findUserByIdentifier
        .mockResolvedValueOnce(null) // email check returns null
        .mockResolvedValueOnce({ id: 'existing' }); // username check returns existing user

      await expect(service.createUser(user)).rejects.toThrow(
        new HttpException(
          'User already exists with username',
          HttpStatus.BAD_REQUEST,
        ),
      );
      expect(userRepository.findUserByIdentifier).toHaveBeenCalledWith(
        user.email,
      );
      expect(userRepository.findUserByIdentifier).toHaveBeenCalledWith(
        user.username,
      );
    });

    it('should create user and send verification email', async () => {
      userRepository.findUserByIdentifier.mockResolvedValue(null);
      userRepository.setVerifyToken.mockResolvedValue('verifyToken123');
      userRepository.createUser.mockResolvedValue({ id: 'createdUserId' });

      const expectedVerificationUrl =
        env.APP_DOMAIN + '/users/verify-user?token=verifyToken123';

      const result = await service.createUser(user);

      expect(userRepository.findUserByIdentifier).toHaveBeenCalledWith(
        user.email,
      );
      expect(userRepository.findUserByIdentifier).toHaveBeenCalledWith(
        user.username,
      );
      expect(userRepository.setVerifyToken).toHaveBeenCalledWith(user.email);
      expect(mailService.sendMail).toHaveBeenCalledWith(
        user.email,
        'please verify your email',
        'verify',
        expect.objectContaining({
          name: user.name,
          verificationUrl: expectedVerificationUrl,
          year: expect.any(Number),
        }),
      );
      expect(userRepository.createUser).toHaveBeenCalledWith(user);
      expect(result).toEqual({ id: 'createdUserId' });
    });

    it('should skip username existence check if username is undefined', async () => {
      const userWithoutUsername = { ...user, username: undefined };
      userRepository.findUserByIdentifier.mockResolvedValue(null);
      userRepository.setVerifyToken.mockResolvedValue('verifyToken123');
      userRepository.createUser.mockResolvedValue({ id: 'createdUserId' });

      await service.createUser(userWithoutUsername);

      expect(userRepository.findUserByIdentifier).toHaveBeenCalledTimes(1);
      expect(userRepository.findUserByIdentifier).toHaveBeenCalledWith(
        userWithoutUsername.email,
      );
      expect(userRepository.setVerifyToken).toHaveBeenCalledWith(
        userWithoutUsername.email,
      );
      expect(mailService.sendMail).toHaveBeenCalled();
    });
  });

  describe('verifyUser', () => {
    const token = 'verifyToken123';
    const email = 'test@example.com';
    const mockUser = { id: 'userId123', email };

    it('should verify user successfully', async () => {
      userRepository.getVerifyToken.mockResolvedValue(email);
      userRepository.findUserByIdentifier.mockResolvedValue(mockUser);
      userRepository.verifyUser.mockResolvedValue(undefined);

      await service.verifyUser(token);

      expect(userRepository.getVerifyToken).toHaveBeenCalledWith(token);
      expect(userRepository.findUserByIdentifier).toHaveBeenCalledWith(email);
      expect(userRepository.verifyUser).toHaveBeenCalledWith(mockUser.id);
    });

    it('should throw if token expired', async () => {
      userRepository.getVerifyToken.mockResolvedValue(null);

      await expect(service.verifyUser(token)).rejects.toThrow(
        new HttpException('token expired', HttpStatus.BAD_REQUEST),
      );
      expect(userRepository.findUserByIdentifier).not.toHaveBeenCalled();
      expect(userRepository.verifyUser).not.toHaveBeenCalled();
    });

    it('should throw if user not found', async () => {
      userRepository.getVerifyToken.mockResolvedValue(email);
      userRepository.findUserByIdentifier.mockResolvedValue(null);

      await expect(service.verifyUser(token)).rejects.toThrow(
        new HttpException("User doesn't exists", HttpStatus.BAD_REQUEST),
      );
      expect(userRepository.verifyUser).not.toHaveBeenCalled();
    });
  });

  describe('updateUser', () => {
    const userUpdate = {
      id: 'userId123',
      isVerified: true,
      isDeleted: false,
      name: 'Updated Name',
      email: 'updated@example.com',
    };

    it('should update user if user exists and is verified and not deleted', async () => {
      userRepository.findUserByIdentifier.mockResolvedValue(userUpdate);
      userRepository.updateUser.mockResolvedValue(userUpdate);

      const result = await service.updateUser(userUpdate);

      expect(userRepository.findUserByIdentifier).toHaveBeenCalledWith(
        userUpdate.id,
      );
      expect(userRepository.updateUser).toHaveBeenCalledWith(userUpdate);
      expect(result).toEqual(userUpdate);
    });

    it('should throw if user does not exist', async () => {
      userRepository.findUserByIdentifier.mockResolvedValue(null);

      await expect(service.updateUser(userUpdate)).rejects.toThrow(
        new HttpException('User not found', HttpStatus.BAD_REQUEST),
      );
      expect(userRepository.updateUser).not.toHaveBeenCalled();
    });

    it('should throw if user is not verified', async () => {
      const notVerifiedUser = { ...userUpdate, isVerified: false };
      userRepository.findUserByIdentifier.mockResolvedValue(notVerifiedUser);

      await expect(service.updateUser(notVerifiedUser)).rejects.toThrow(
        new HttpException('User not found', HttpStatus.BAD_REQUEST),
      );
      expect(userRepository.updateUser).not.toHaveBeenCalled();
    });

    it('should throw if user is deleted', async () => {
      const deletedUser = { ...userUpdate, isDeleted: true };
      userRepository.findUserByIdentifier.mockResolvedValue(deletedUser);

      await expect(service.updateUser(deletedUser)).rejects.toThrow(
        new HttpException('User not found', HttpStatus.BAD_REQUEST),
      );
      expect(userRepository.updateUser).not.toHaveBeenCalled();
    });
  });
});

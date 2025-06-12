import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { RegisterDto, UpdateUserDto } from '../dtos/user.dto';
import { HttpStatus, HttpException } from '@nestjs/common';
import { Request } from 'express';
import { PublicUser } from '../drizzle/schema';
import { Session } from 'express-session';

const mockUserService = {
  createUser: jest.fn(),
  updateUser: jest.fn(),
  verifyUser: jest.fn(),
};

jest.mock('nodemailer-express-handlebars', () => {
  return jest.fn();
});

describe('UserController', () => {
  let controller: UserController;
  let userService: UserService;
  let mockRequest: Partial<Request>;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockRequest = {
      session: {
        userId: 'test-user-id',
      } as Partial<Session> as Session,
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    userService = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createUser', () => {
    const dto: RegisterDto = {
      email: 'test@example.com',
      password: 'password123',
      name: 'test',
      username: 'test@test',
    };

    it('should call createUser and return message', async () => {
      await expect(controller.createUser(dto)).resolves.toEqual({
        message: 'please check your mail!!!',
      });

      expect(userService.createUser).toHaveBeenCalledWith(dto);
    });
  });

  describe('updateUser', () => {
    const dto: UpdateUserDto = {
      name: 'Updated Name',
    };

    const expectedUser: PublicUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Updated Name',
      username: '',
      createdAt: null,
    };

    it('should call updateUser if session userId exists', async () => {
      mockUserService.updateUser.mockResolvedValue(expectedUser);

      const result = await controller.updateUser(dto, mockRequest as Request);

      expect(userService.updateUser).toHaveBeenCalledWith({
        ...dto,
        id: 'test-user-id',
      });
      expect(result).toEqual(expectedUser);
    });

    it('should throw Unauthorized if no session userId', async () => {
      mockRequest.session!.userId = undefined;

      await expect(
        controller.updateUser(dto, mockRequest as Request),
      ).rejects.toThrow(
        new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED),
      );

      expect(userService.updateUser).not.toHaveBeenCalled();
    });
  });

  describe('verifyUser', () => {
    it('should call verifyUser with token and return result', async () => {
      const token = 'some-verification-token';
      const expectedUser: PublicUser = {
        id: 'verified-id',
        email: 'verified@example.com',
        name: 'Verified User',
        createdAt: null,
        username: 'test@test',
      };

      mockUserService.verifyUser.mockResolvedValue(expectedUser);

      const result = await controller.verifyUser(token);

      expect(userService.verifyUser).toHaveBeenCalledWith(token);
      expect(result).toEqual(expectedUser);
    });
  });
});

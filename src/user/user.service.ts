import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateUser, UpdateUser } from '../drizzle/schema';
import { UserRepository } from './user.repository';
import { MailService } from '../mail/mail.service';
import { env } from '../config/env.validation';

@Injectable()
export class UserService {
  constructor(
    private userRepository: UserRepository,
    private mailService: MailService,
  ) {}

  async findUserByIdentifier(identifier: string) {
    return this.userRepository.findUserByIdentifier(identifier);
  }

  async createUser(user: CreateUser) {
    const isEmailExists = await this.userRepository.findUserByIdentifier(
      user.email,
    );
    if (isEmailExists) {
      throw new HttpException(
        'User already exists with email',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (user.username) {
      const isUsernameExists = await this.userRepository.findUserByIdentifier(
        user.username,
      );
      if (isUsernameExists) {
        throw new HttpException(
          'User already exists with username',
          HttpStatus.BAD_REQUEST,
        );
      }
    }
    const verificationToken = await this.userRepository.setVerifyToken(
      user.email,
    );
    const verificationUrl =
      env.APP_DOMAIN + '/users/verify-user?token=' + verificationToken;
    await this.mailService.sendMail(
      user.email,
      'please verify your email',
      'verify',
      {
        name: user.name,
        verificationUrl,
        year: new Date().getFullYear(),
      },
    );
    return this.userRepository.createUser(user);
  }

  async verifyUser(token: string) {
    const email = await this.userRepository.getVerifyToken(token);
    if (!email) {
      throw new HttpException('token expired', HttpStatus.BAD_REQUEST);
    }
    const user = await this.userRepository.findUserByIdentifier(email);
    if (!user) {
      throw new HttpException("User doesn't exists", HttpStatus.BAD_REQUEST);
    }
    return this.userRepository.verifyUser(user.id);
  }

  async updateUser(user: UpdateUser) {
    const isUserExists = await this.userRepository.findUserByIdentifier(
      user.id,
    );
    if (!isUserExists || !user.isVerified || user.isDeleted) {
      throw new HttpException('User not found', HttpStatus.BAD_REQUEST);
    }
    return this.userRepository.updateUser(user);
  }
}

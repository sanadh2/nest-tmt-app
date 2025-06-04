import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  MaxLength,
  Length,
  IsBoolean,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    description: 'The unique username of the user (optional)',
    minLength: 3,
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Username must be at least 3 characters' })
  username?: string;

  @ApiProperty({
    description: "The user's password",
    minLength: 6,
  })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password!: string;

  @ApiProperty({
    description: "The user's email address",
    format: 'email',
  })
  @IsEmail({}, { message: 'Invalid email' })
  email!: string;

  @ApiProperty({
    description: "The user's full name",
    minLength: 1,
  })
  @IsString()
  @MinLength(1, { message: 'Name cannot be empty' })
  name!: string;
}

export class UpdateUserDto {
  @ApiProperty({
    description: "User's email address",
    required: false,
    format: 'email',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email address' })
  email?: string;

  @ApiProperty({
    description: "User's full name",
    required: false,
    minLength: 1,
  })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Name cannot be empty' })
  name?: string;

  @ApiProperty({
    description: "User's password",
    required: false,
    minLength: 6,
  })
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password?: string;

  @ApiProperty({
    description: 'Username (must be unique)',
    required: false,
    minLength: 3,
  })
  @IsOptional()
  @IsString()
  @Length(3, 256, {
    message: 'Username must be between 3 and 256 characters',
  })
  username?: string;
}

export class LoginDto {
  @ApiProperty({
    description: "The user's username or email address",
    minLength: 3,
    maxLength: 100,
  })
  @IsString()
  @MinLength(3, { message: 'Identifier must be at least 3 characters' })
  @MaxLength(100, { message: 'Identifier must be at most 30 characters' })
  identifier!: string;

  @ApiProperty({
    description: "The user's password",
    minLength: 6,
    maxLength: 100,
  })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  @MaxLength(100, { message: 'Password must be at most 20 characters' })
  password!: string;
}

export class ResendVerificationDto {
  @ApiProperty({
    description: "The user's email or username",
    minLength: 3,
    maxLength: 100,
  })
  @IsString()
  @MinLength(3, { message: 'Identifier must be at least 3 characters' })
  @MaxLength(100, { message: 'Identifier must be at most 100 characters' })
  identifier!: string;
}

export class VerificationDTO {
  @ApiProperty({
    description: 'verification token string',
    minLength: 3,
    maxLength: 100,
  })
  @IsString()
  @MinLength(3, { message: 'token must be at least 3 characters' })
  @MaxLength(100, { message: 'token must be at most 100 characters' })
  token!: string;
}

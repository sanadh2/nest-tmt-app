import { Test, TestingModule } from '@nestjs/testing';
import { GoogleStrategy } from './google.strategy';

describe('GoogleStrategy', () => {
  let strategy: GoogleStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GoogleStrategy],
    }).compile();

    strategy = module.get<GoogleStrategy>(GoogleStrategy);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    const accessToken = 'mock-access-token';
    const refreshToken = 'mock-refresh-token';
    const profile = {
      name: {
        givenName: 'John',
        familyName: 'Doe',
      },
      emails: [{ value: 'john.doe@example.com' }],
      photos: [{ value: 'https://example.com/photo.jpg' }],
    };

    it('should return user object with profile data', async () => {
      const done = jest.fn();

      await strategy.validate(accessToken, refreshToken, profile, done);

      expect(done).toHaveBeenCalledWith(null, {
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        picture: 'https://example.com/photo.jpg',
        accessToken: 'mock-access-token',
      });
    });

    it('should handle profile with missing optional fields', async () => {
      const incompleteProfile = {
        name: {
          givenName: 'John',
          familyName: undefined,
        },
        emails: [{ value: 'john@example.com' }],
        photos: [{ value: 'https://example.com/photo.jpg' }],
      };
      const done = jest.fn();

      await strategy.validate(accessToken, refreshToken, incompleteProfile, done);

      expect(done).toHaveBeenCalledWith(null, {
        email: 'john@example.com',
        firstName: 'John',
        lastName: undefined,
        picture: 'https://example.com/photo.jpg',
        accessToken: 'mock-access-token',
      });
    });

    it('should handle profile with only givenName', async () => {
      const profileWithOnlyGivenName = {
        name: {
          givenName: 'John',
          familyName: undefined,
        },
        emails: [{ value: 'john@example.com' }],
        photos: [{ value: 'https://example.com/photo.jpg' }],
      };
      const done = jest.fn();

      await strategy.validate(accessToken, refreshToken, profileWithOnlyGivenName, done);

      expect(done).toHaveBeenCalledWith(null, {
        email: 'john@example.com',
        firstName: 'John',
        lastName: undefined,
        picture: 'https://example.com/photo.jpg',
        accessToken: 'mock-access-token',
      });
    });
  });
}); 
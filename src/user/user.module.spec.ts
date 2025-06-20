import { UserModule } from './user.module';

describe('UserModule', () => {
  it('should be defined', () => {
    expect(UserModule).toBeDefined();
  });

  it('should have the correct structure', () => {
    expect(typeof UserModule).toBe('function');
  });
}); 
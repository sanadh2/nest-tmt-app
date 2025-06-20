import { AuthModule } from './auth.module';

describe('AuthModule', () => {
  it('should be defined', () => {
    expect(AuthModule).toBeDefined();
  });

  it('should have the correct structure', () => {
    expect(typeof AuthModule).toBe('function');
  });
}); 
import { RedisModule } from './redis.module';

describe('RedisModule', () => {
  it('should be defined', () => {
    expect(RedisModule).toBeDefined();
  });

  it('should have the correct structure', () => {
    expect(typeof RedisModule).toBe('function');
  });
}); 
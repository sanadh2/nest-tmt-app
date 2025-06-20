import { RedisRepository } from './redis.repository';

describe('RedisRepository', () => {
  it('should be defined', () => {
    expect(RedisRepository).toBeDefined();
  });

  it('should have the correct structure', () => {
    expect(typeof RedisRepository).toBe('function');
  });
}); 
import { Module } from '@nestjs/common';
import Redis from 'ioredis';
import { env } from 'src/config/env.validation';
import { RedisRepository } from './redis.repository';

const redisProvider = {
  provide: 'REDIS_CLIENT',
  useFactory: () => {
    const client = new Redis({
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      password: env.REDIS_PASSWORD,
      username: env.REDIS_USERNAME,
    });
    return client;
  },
};

@Module({
  providers: [redisProvider, RedisRepository],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule {}

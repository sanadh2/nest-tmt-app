import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisRepository {
  constructor(@Inject('REDIS_CLIENT') private readonly redisClient: Redis) {}
}

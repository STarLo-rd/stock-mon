import { createClient } from 'redis';
import { config } from '../config';
import logger from './logger';

const client = createClient({
  url: config.redis.url,
});

client.on('error', (err) => {
  logger.error('Redis Client Error', { error: err });
});

client.on('connect', () => {
  logger.info('Redis Client Connected');
});

export const redisClient = client;

export async function connectRedis(): Promise<void> {
  if (!client.isOpen) {
    await client.connect();
  }
}

export async function disconnectRedis(): Promise<void> {
  if (client.isOpen) {
    await client.disconnect();
  }
}


import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

type Handler<T = unknown> = (payload: T) => void | Promise<void>;

interface Envelope {
  event: string;
  payload: unknown;
}

@Injectable()
export class EventBus implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventBus.name);
  private readonly channel = 'teamboard:events';
  private readonly handlers = new Map<string, Handler[]>();

  private publisher?: Redis;
  private subscriber?: Redis;
  private useRedis = false;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const url = this.config.get<string>('redisUrl');
    if (!url) {
      this.logger.log('REDIS_URL not set — using in-process event bus');
      return;
    }

    this.publisher = new Redis(url, { maxRetriesPerRequest: null });
    this.subscriber = new Redis(url, { maxRetriesPerRequest: null });
    await this.subscriber.subscribe(this.channel);
    this.subscriber.on('message', (_channel, message) => {
      try {
        const { event, payload } = JSON.parse(message) as Envelope;
        void this.dispatch(event, payload);
      } catch (error) {
        this.logger.error('Failed to handle event message', error as Error);
      }
    });
    this.useRedis = true;
    this.logger.log('Connected to Redis — using Redis pub/sub event bus');
  }

  async onModuleDestroy(): Promise<void> {
    await this.publisher?.quit();
    await this.subscriber?.quit();
  }

  on<T>(event: string, handler: Handler<T>): void {
    const list = this.handlers.get(event) ?? [];
    list.push(handler as Handler);
    this.handlers.set(event, list);
  }

  async publish(event: string, payload: unknown): Promise<void> {
    if (this.useRedis && this.publisher) {
      await this.publisher.publish(
        this.channel,
        JSON.stringify({ event, payload } satisfies Envelope),
      );
      return;
    }
    await this.dispatch(event, payload);
  }

  private async dispatch(event: string, payload: unknown): Promise<void> {
    const list = this.handlers.get(event) ?? [];
    await Promise.all(list.map((handler) => handler(payload)));
  }
}

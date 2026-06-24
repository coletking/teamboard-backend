import { Controller, Get } from '@nestjs/common';

/** Unauthenticated liveness probe — handy for Docker/health checks & uptime. */
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      service: 'teamboard-backend',
      timestamp: new Date().toISOString(),
    };
  }
}

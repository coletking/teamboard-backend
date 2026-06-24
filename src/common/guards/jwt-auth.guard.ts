import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Thin wrapper around Passport's JWT guard. Routes decorated with
 * `@UseGuards(JwtAuthGuard)` require a valid `Authorization: Bearer <token>`.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

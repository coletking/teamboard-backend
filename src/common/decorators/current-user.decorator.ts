import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** Shape attached to `req.user` by the JWT strategy after validation. */
export interface AuthUser {
  userId: string;
  email: string;
}

/**
 * Convenience decorator to pull the authenticated user (or a single field of
 * it) off the request, e.g. `@CurrentUser('userId') id: string`.
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthUser }>();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);

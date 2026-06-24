/**
 * Centralised, typed configuration loaded from environment variables.
 * Consumed everywhere through Nest's ConfigService so no module reads
 * `process.env` directly.
 */
export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  mongoUri: process.env.MONGO_URI,
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
  },
  // Default password assigned to users created via a project invite.
  defaultInvitePassword: process.env.DEFAULT_INVITE_PASSWORD ?? 'TeamBoard123!',
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL ?? '60', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT ?? '100', 10),
  },
});

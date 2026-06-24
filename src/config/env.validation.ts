import * as Joi from 'joi';

/**
 * Fail-fast validation of the environment. If a required variable is missing
 * or malformed the application refuses to boot, surfacing config errors
 * immediately instead of at request time.
 */
export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  MONGO_URI: Joi.string().required(),
  CORS_ORIGIN: Joi.string().default('*'),
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default('1d'),
  DEFAULT_INVITE_PASSWORD: Joi.string().min(6).default('TeamBoard123!'),
  THROTTLE_TTL: Joi.number().default(60),
  THROTTLE_LIMIT: Joi.number().default(100),
});
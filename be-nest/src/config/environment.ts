import Joi from 'joi';

export type NodeEnvironment = 'development' | 'test' | 'production';

export interface Environment {
  NODE_ENV: NodeEnvironment;
  PORT: number;
  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  TRUSTED_ORIGINS: string;
  S3_ENDPOINT: string;
  S3_PUBLIC_ENDPOINT: string;
  S3_BUCKET: string;
  S3_ACCESS_KEY: string;
  S3_SECRET_KEY: string;
  SMTP_HOST?: string;
  SMTP_PORT: number;
  SMTP_USER?: string;
  SMTP_PASSWORD?: string;
  SMTP_FROM: string;
  ALLOW_DATABASE_RESET: boolean;
}

const schema = Joi.object<Environment>({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().port().default(8081),
  DATABASE_URL: Joi.string().uri({ scheme: ['postgres', 'postgresql'] }).required(),
  BETTER_AUTH_SECRET: Joi.string().min(32).required(),
  BETTER_AUTH_URL: Joi.string().uri().required(),
  TRUSTED_ORIGINS: Joi.string().required(),
  S3_ENDPOINT: Joi.string().uri().required(),
  S3_PUBLIC_ENDPOINT: Joi.string().uri().required(),
  S3_BUCKET: Joi.string().min(3).required(),
  S3_ACCESS_KEY: Joi.string().required(),
  S3_SECRET_KEY: Joi.string().required(),
  SMTP_HOST: Joi.string().allow('').optional(),
  SMTP_PORT: Joi.number().port().default(587),
  SMTP_USER: Joi.string().allow('').optional(),
  SMTP_PASSWORD: Joi.string().allow('').optional(),
  SMTP_FROM: Joi.string().email().default('no-reply@example.com'),
  ALLOW_DATABASE_RESET: Joi.boolean().truthy('true').falsy('false').default(false),
});

export function validateEnvironment(values: Record<string, unknown>): Environment {
  const result = schema.validate(values, { allowUnknown: true, abortEarly: false });
  if (result.error) {
    throw new Error(`Cấu hình môi trường không hợp lệ: ${result.error.message}`);
  }
  return result.value;
}

export function parseTrustedOrigins(value: string): string[] {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

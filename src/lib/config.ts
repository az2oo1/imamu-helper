import 'dotenv/config';

export const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev_only';

export const APP_CONFIG = {
  PORT: Number(process.env.PORT) || 3000,
  CONNECT_APP_URL: process.env.CONNECT_APP_URL || 'http://localhost:3000',
  IS_DEV: process.env.NODE_ENV !== 'production',
  IS_TEST: process.env.NODE_ENV === 'test',
};

export default {
  ENDPOINT_URL: process.env.ENDPOINT_URL || '',
  IS_DEV: process.env.DEV === 'true' || false,
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
  WEBHOOK_PATH: process.env.WEBHOOK_PATH || '',
};

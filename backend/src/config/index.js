// Central configuration — all env vars read from one place
require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isVercel: process.env.VERCEL === '1',
  adminApiKey: process.env.ADMIN_API_KEY || 'pgms_admin_secret_2026',
  jwtSecret: process.env.JWT_SECRET || 'pgms_secret_key_2026',
};

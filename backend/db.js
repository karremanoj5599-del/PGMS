require('dotenv').config();

// Node.js 18/20+ tries IPv4 + IPv6 simultaneously. On Indian networks (Jio/Airtel)
// IPv6 routes almost always fail, causing AggregateError [ETIMEDOUT].
// Only apply this fix locally, as Vercel infrastructure handles DNS differently.
if (process.env.VERCEL !== '1') {
  require('dns').setDefaultResultOrder('ipv4first');
}
// ─────────────────────────────────────────────────────────────────────────────

const knex = require('knex');
const config = require('./knexfile');

// Use supabase config if SUPABASE_DATABASE_URL is present, otherwise fallback to development (sqlite)
const environment = process.env.SUPABASE_DATABASE_URL ? 'supabase' : 'development';
console.log(`[DB] Connecting to environment: ${environment}`);

const db = knex(config[environment]);

// ─── Verify connection on startup (non-fatal) ────────────────────────────────
db.raw('SELECT 1')
  .then(() => console.log('[DB] ✅ Database connection successful'))
  .catch(err => {
    console.error('[DB] ❌ Database connection failed:', err.message);
    if (environment === 'supabase') {
      console.error('[DB] 💡 Tip: Check your internet/VPN, or comment out SUPABASE_DATABASE_URL in .env to use local SQLite.');
    }
  });

module.exports = db;

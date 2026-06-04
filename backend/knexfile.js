require('dotenv').config();

const supabaseConfig = {
  client: 'pg',
  connection: {
    connectionString: process.env.SUPABASE_DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
    query_timeout: 15000,
    statement_timeout: 15000,
  },
  pool: {
    min: 0,
    max: 3,
    acquireTimeoutMillis: 5000,
    createTimeoutMillis: 5000,
    destroyTimeoutMillis: 5000,
    idleTimeoutMillis: 5000,
    reapIntervalMillis: 1000,
    propagateCreateError: true,
  },
  migrations: {
    directory: './migrations'
  },
  beds: {
    directory: './test-data'
  }
};

module.exports = {
  development: process.env.VERCEL ? supabaseConfig : {
    client: 'sqlite3',
    connection: {
      filename: './dev.sqlite3'
    },
    useNullAsDefault: true,
    migrations: {
      directory: './migrations'
    },
    beds: {
      directory: './test-data'
    }
  },
  production: supabaseConfig,
  supabase: supabaseConfig
};
